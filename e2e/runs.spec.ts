import { expect, test } from '@playwright/test';
import { completedRun, feature, reviewRun, runSummary } from './runs.fixture';

const listApi = /\/api\/v1\/runs(?:\?|$)/;
const detailApi = '**/api/v1/runs/' + reviewRun.runId;
const detailPath = '/runs/' + reviewRun.runId;

test('filters by status, follows an opaque cursor and returns to that page', async ({
  page,
}) => {
  const anotherRun = {
    ...runSummary(completedRun),
    runId: '20000000-0000-4000-8000-000000000003',
    jiraIssueKey: 'DEMO-102',
  };
  const nextCursor = 'opaque.next+/=';
  const received: Array<{ status: string | null; cursor: string | null }> = [];
  await page.route(listApi, async (route) => {
    const url = new URL(route.request().url());
    const status = url.searchParams.get('status');
    const cursor = url.searchParams.get('cursor');
    received.push({ status, cursor });
    if (status !== 'completed') {
      await route.fulfill({
        json: { items: [runSummary(reviewRun), anotherRun] },
      });
    } else if (cursor === nextCursor) {
      await route.fulfill({ json: { items: [runSummary(completedRun)] } });
    } else {
      await route.fulfill({ json: { items: [anotherRun], nextCursor } });
    }
  });
  await page.route(detailApi, (route) => route.fulfill({ json: completedRun }));

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'DEMO-101' })).toBeVisible();
  await page.getByLabel('Status', { exact: true }).selectOption('completed');
  await expect(page).toHaveURL(/status=completed/);
  await expect(page.getByRole('link', { name: 'DEMO-101' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByRole('link', { name: 'DEMO-101' })).toBeVisible();
  expect(received.at(-1)).toEqual({ status: 'completed', cursor: nextCursor });

  await page.getByRole('link', { name: 'DEMO-101' }).click();
  await expect(page.getByRole('heading', { name: 'DEMO-101' })).toBeVisible();
  await page.getByRole('link', { name: 'All runs' }).click();
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue(
    'completed',
  );
  await expect(page.getByRole('link', { name: 'DEMO-101' })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('cursor')).toBe(nextCursor);
  await page.getByRole('button', { name: 'First page' }).click();
  await expect(page.getByRole('link', { name: 'DEMO-102' })).toBeVisible();
  expect(received.at(-1)).toEqual({ status: 'completed', cursor: null });
});

test('opens a direct run link and reloads the evidence for the tested revision', async ({
  page,
}) => {
  let response = reviewRun;
  let releaseFirstResponse!: () => void;
  const firstResponse = new Promise<void>((resolve) => {
    releaseFirstResponse = resolve;
  });
  await page.route(detailApi, async (route) => {
    await firstResponse;
    await route.fulfill({ json: response });
  });

  await page.goto(detailPath);
  await expect(page.getByRole('status')).toContainText('Loading run');
  releaseFirstResponse();
  await expect(page.getByRole('heading', { name: 'DEMO-101' })).toBeVisible();
  await expect(
    page.getByText('This version is awaiting a review decision.'),
  ).toBeVisible();
  await expect(page.getByText('demo-catalog-v1')).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Products Catalog GET contract/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Workflow timeline' }),
  ).toBeVisible();
  await expect(page.locator('.timeline li[aria-current="step"]')).toContainText(
    'Awaiting review',
  );
  expect(await page.locator('pre code').textContent()).toBe(feature);

  response = completedRun;
  await page.reload();
  await expect(
    page.getByRole('link', { name: /Pull request #21/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /GitHub Actions run/ }),
  ).toHaveAttribute('href', completedRun.ci!.workflowRunUrl!);
  await expect(
    page.getByRole('link', { name: /Allure artifact/ }),
  ).toHaveAttribute('href', completedRun.ci!.allureArtifact!.url);
  await expect(
    page.getByText('This result applies to an earlier PR revision.'),
  ).toBeVisible();
  await expect(
    page.getByText(completedRun.ci!.testedCommitSha!, { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.timeline li[aria-current="step"]')).toContainText(
    'Completed',
  );
  await expect(
    page.getByText('This version is awaiting a review decision.'),
  ).toHaveCount(0);
});

test('reports a skipped browser job separately from the Gherkin check', async ({
  page,
}) => {
  await page.route(detailApi, (route) =>
    route.fulfill({
      json: {
        ...completedRun,
        ci: {
          status: 'not_run',
          gherkinCheckStatus: 'passed',
          reasonCode: 'storefront_skipped',
        },
      },
    }),
  );
  await page.goto(detailPath);
  const ci = page.getByRole('region', { name: 'Publication and CI' });
  await expect(ci.getByText('Passed', { exact: true })).toBeVisible();
  await expect(ci.getByText('Not run', { exact: true })).toBeVisible();
  await expect(
    ci.getByText('GitHub Actions skipped the storefront job.'),
  ).toBeVisible();
  await expect(ci.getByRole('link', { name: /Allure artifact/ })).toHaveCount(
    0,
  );
});

test('offers retry on an API error and handles empty filtered lists', async ({
  page,
}) => {
  let unavailable = true;
  await page.route(listApi, (route) =>
    unavailable
      ? route.fulfill({
          status: 503,
          json: { code: 'orchestrator_unavailable' },
        })
      : route.fulfill({ json: { items: [] } }),
  );
  await page.goto('/runs?status=queued');
  await expect(page.getByRole('alert')).toContainText('Unable to load');
  unavailable = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('No runs found')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filter' }).click();
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('');
  await expect(page).toHaveURL(/\/runs$/);
});

test('shows a missing run and renders a queued run with unavailable evidence', async ({
  page,
}) => {
  let missing = true;
  await page.route(detailApi, (route) =>
    missing
      ? route.fulfill({ status: 404, json: { code: 'run_not_found' } })
      : route.fulfill({
          json: {
            ...runSummary(reviewRun),
            status: 'queued',
            input: reviewRun.input,
            history: [reviewRun.history[0]],
          },
        }),
  );
  await page.goto(detailPath);
  await expect(page.getByRole('alert')).toContainText('Run unavailable');
  missing = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(
    page.getByText('Handoff details are unavailable for this run.'),
  ).toBeVisible();
  await expect(
    page.getByText('No Gherkin proposal is available.'),
  ).toBeVisible();
  await expect(
    page.getByText('CI evidence is unavailable for this run.'),
  ).toBeVisible();
});
