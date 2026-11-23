import { expect, test } from '@playwright/test';
import type { RunDetail } from '../src/app/features/runs/domain/runs';
import { completedRun, reviewRun, runSummary } from './runs.fixture';

test('follows the catalog handoff through the reviewed revision to its Allure attempt', async ({
  page,
}) => {
  const traceCorrelationId = 'ed'.repeat(32);
  const at = '2026-11-22T12:00:12Z';
  const decision: RunDetail['decision'] = {
    decision: 'approve',
    featureSha256: reviewRun.review!.featureSha256,
    reviewer: {
      issuer: 'https://issuer.example.test',
      subject: 'demo-reviewer',
    },
    decidedAt: at,
  };
  const approved: RunDetail = {
    ...reviewRun,
    traceCorrelationId,
    status: 'publishing',
    history: [...reviewRun.history, { status: 'publishing', at }],
    updatedAt: at,
    decision,
  };
  const published: RunDetail = {
    ...completedRun,
    traceCorrelationId,
    decision,
  };
  let current: RunDetail = { ...reviewRun, traceCorrelationId };

  await page.route(/\/api\/v1\/runs$/, (route) =>
    route.fulfill({ json: { items: [runSummary(current)] } }),
  );
  const detailApi = '**/api/v1/runs/' + reviewRun.runId;
  await page.route(detailApi, (route) => route.fulfill({ json: current }));
  await page.route(detailApi + '/decisions', (route) => {
    expect(route.request().postDataJSON()).toEqual({
      decision: 'approve',
      expectedFeatureSha256: decision.featureSha256,
    });
    current = approved;
    return route.fulfill({
      status: 202,
      json: { runId: current.runId, status: current.status },
    });
  });

  await page.goto('/runs');
  await page.getByRole('link', { name: 'DEMO-101' }).click();
  await expect(page.getByRole('heading', { name: 'BA handoff' })).toBeVisible();
  await expect(page.getByText('demo-catalog-v1')).toBeVisible();
  await expect(
    page.getByText(decision.featureSha256, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(traceCorrelationId, { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Approve version' }).click();

  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  await expect(page.locator('.timeline li[aria-current="step"]')).toContainText(
    'Publishing',
  );

  current = published;
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.locator('.timeline li[aria-current="step"]')).toContainText(
    'Completed',
  );
  await expect(
    page.getByText(traceCorrelationId, { exact: true }),
  ).toBeVisible();
  const evidence = page.getByRole('region', { name: 'Publication and CI' });
  await expect(evidence.getByText('Passed', { exact: true })).toHaveCount(2);
  await expect(
    evidence.getByText('This result applies to an earlier PR revision.'),
  ).toBeVisible();
  await expect(
    evidence.getByText(published.ci!.testedCommitSha!, { exact: true }),
  ).toBeVisible();
  await expect(
    evidence.getByRole('link', { name: /Pull request #21/ }),
  ).toHaveAttribute('href', published.publication!.url);
  await expect(
    evidence.getByRole('link', { name: /GitHub Actions run/ }),
  ).toHaveAttribute('href', published.ci!.workflowRunUrl!);
  await expect(
    evidence.getByRole('link', { name: /Allure artifact/ }),
  ).toHaveAttribute('href', published.ci!.allureArtifact!.url);
});
