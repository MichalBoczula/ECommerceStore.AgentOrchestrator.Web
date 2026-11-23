import { expect, test } from '@playwright/test';
import type {
  DecisionInput,
  RunDetail,
} from '../src/app/features/runs/domain/runs';
import { reviewRun } from './runs.fixture';

const detailApi = '**/api/v1/runs/' + reviewRun.runId;
const detailPath = '/runs/' + reviewRun.runId;
const decisionsApi = detailApi + '/decisions';
const reviewedHash = reviewRun.review!.featureSha256;

function recordDecision(run: RunDetail, input: DecisionInput): RunDetail {
  const at = '2026-11-22T12:00:12Z';
  const status = input.decision === 'approve' ? 'publishing' : 'rejected';
  return {
    ...run,
    status,
    updatedAt: at,
    history: [...run.history, { status, at }],
    decision: {
      decision: input.decision,
      featureSha256: input.expectedFeatureSha256,
      reason: input.reason,
      decidedAt: at,
      reviewer: { issuer: 'https://issuer.example.test', subject: 'reviewer' },
    },
  };
}

function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

test('binds approval to the displayed version and ignores a rapid second click', async ({
  page,
}) => {
  const responses = deferred();
  const reload = deferred();
  let current = reviewRun;
  let reads = 0;
  const requests: DecisionInput[] = [];
  await page.route(detailApi, async (route) => {
    reads++;
    if (current.decision) await reload.promise;
    await route.fulfill({ json: current });
  });
  await page.route(decisionsApi, async (route) => {
    const input: DecisionInput = route.request().postDataJSON();
    requests.push(input);
    await responses.promise;
    current = recordDecision(current, input);
    await route.fulfill({
      status: 202,
      json: { runId: current.runId, status: current.status },
    });
  });

  await page.goto(detailPath);
  await expect(page.getByText(reviewedHash, { exact: true })).toBeVisible();
  const approve = page.getByRole('button', { name: 'Approve version' });
  await approve.evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(approve).toBeDisabled();
  await expect
    .poll(() => requests)
    .toEqual([{ decision: 'approve', expectedFeatureSha256: reviewedHash }]);

  responses.release();
  await expect.poll(() => reads).toBe(2);
  await expect(approve).toBeDisabled();
  reload.release();
  await expect(
    page.getByText('Decision recorded.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  await expect(page.locator('.timeline li[aria-current="step"]')).toContainText(
    'Publishing',
  );
  await expect(approve).toHaveCount(0);
  expect(requests).toHaveLength(1);
});

test('validates the rejection reason and shows the persisted decision', async ({
  page,
}) => {
  let current = reviewRun;
  const requests: DecisionInput[] = [];
  await page.route(detailApi, (route) => route.fulfill({ json: current }));
  await page.route(decisionsApi, async (route) => {
    const input: DecisionInput = route.request().postDataJSON();
    requests.push(input);
    current = recordDecision(current, input);
    await route.fulfill({
      status: 202,
      json: { runId: current.runId, status: current.status },
    });
  });

  await page.goto(detailPath);
  await page.getByText('Reject version…', { exact: true }).click();
  const reason = page.getByLabel('Reason for rejection');
  const submit = page.getByRole('button', { name: 'Record rejection' });
  await expect(submit).toBeDisabled();
  await reason.fill('  \n ');
  await expect(submit).toBeDisabled();
  await reason.fill('x'.repeat(2001));
  await expect(reason).toHaveAttribute('aria-invalid', 'true');
  await expect(submit).toBeDisabled();
  expect(requests).toHaveLength(0);

  const explanation = 'Add an assertion for the selected phone specifications.';
  await reason.fill('  ' + explanation + '  ');
  await submit.click();
  await expect(page.getByText(explanation, { exact: true })).toBeVisible();
  await expect(page.locator('.timeline li[aria-current="step"]')).toContainText(
    'Rejected',
  );
  await expect(submit).toHaveCount(0);
  expect(requests).toEqual([
    {
      decision: 'reject',
      expectedFeatureSha256: reviewedHash,
      reason: explanation,
    },
  ]);
});

test('refreshes a stale proposal and requires a decision on the new version', async ({
  page,
}) => {
  const refreshedReview = {
    ...reviewRun.review!,
    featureSha256: 'd'.repeat(64),
    feature:
      reviewRun.review!.feature + '    And I can see its specifications\n',
  };
  let current = reviewRun;
  const requests: DecisionInput[] = [];
  await page.route(detailApi, (route) => route.fulfill({ json: current }));
  await page.route(decisionsApi, async (route) => {
    const input: DecisionInput = route.request().postDataJSON();
    requests.push(input);
    if (requests.length === 1) {
      current = { ...reviewRun, review: refreshedReview };
      await route.fulfill({
        status: 409,
        json: { code: 'stale_feature_hash' },
      });
      return;
    }
    current = recordDecision(current, input);
    await route.fulfill({
      status: 202,
      json: { runId: current.runId, status: current.status },
    });
  });

  await page.goto(detailPath);
  await page.getByText('Reject version…', { exact: true }).click();
  await page
    .getByLabel('Reason for rejection')
    .fill('Issue in the original version.');
  await page.getByRole('button', { name: 'Record rejection' }).click();
  await expect(
    page.getByText(/Review the refreshed proposal before deciding again/),
  ).toBeVisible();
  await expect(
    page.getByText(refreshedReview.featureSha256, { exact: true }),
  ).toBeVisible();
  await expect(page.locator('pre code')).toContainText(
    'And I can see its specifications',
  );
  expect(requests.map((input) => input.expectedFeatureSha256)).toEqual([
    reviewedHash,
  ]);

  await page.getByText('Reject version…', { exact: true }).click();
  await expect(page.getByLabel('Reason for rejection')).toHaveValue('');
  await page.getByText('Reject version…', { exact: true }).click();

  await page.getByRole('button', { name: 'Approve version' }).click();
  await expect(
    page.getByText('Decision recorded.', { exact: true }),
  ).toBeVisible();
  expect(requests[1]).toEqual({
    decision: 'approve',
    expectedFeatureSha256: refreshedReview.featureSha256,
  });
});

test('shows the single persisted decision in two tabs', async ({
  context,
  page,
}) => {
  let current = reviewRun;
  let attempts = 0;
  let accepted = 0;
  await context.route(detailApi, (route) => route.fulfill({ json: current }));
  await context.route(decisionsApi, async (route) => {
    attempts++;
    if (current.status !== 'awaiting_review') {
      await route.fulfill({ status: 409, json: { code: 'review_closed' } });
      return;
    }
    accepted++;
    current = recordDecision(current, route.request().postDataJSON());
    await route.fulfill({
      status: 202,
      json: { runId: current.runId, status: current.status },
    });
  });

  const otherPage = await context.newPage();
  const tabs = [page, otherPage];
  await Promise.all(tabs.map((tab) => tab.goto(detailPath)));
  await Promise.all(
    tabs.map((tab) =>
      tab.getByRole('button', { name: 'Approve version' }).click(),
    ),
  );
  for (const tab of tabs) {
    await expect(tab.getByText('Approved', { exact: true })).toBeVisible();
    await expect(
      tab.locator('.timeline li').filter({ hasText: 'Publishing' }),
    ).toHaveCount(1);
    await expect(
      tab.getByRole('button', { name: 'Approve version' }),
    ).toHaveCount(0);
  }
  const notices = await Promise.all(
    tabs.map((tab) =>
      tab.getByText('A decision was already recorded for this review.').count(),
    ),
  );
  expect(notices[0] + notices[1]).toBe(1);
  expect(attempts).toBe(2);
  expect(accepted).toBe(1);
});

test('checks the saved run after an interrupted response', async ({ page }) => {
  let current = reviewRun;
  let submissions = 0;
  await page.route(detailApi, (route) => route.fulfill({ json: current }));
  await page.route(decisionsApi, async (route) => {
    submissions++;
    current = recordDecision(current, route.request().postDataJSON());
    await route.abort('failed');
  });

  await page.goto(detailPath);
  await page.getByRole('button', { name: 'Approve version' }).click();
  await expect(
    page.getByText(/The decision outcome could not be confirmed/),
  ).toBeVisible();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Approve version' }),
  ).toHaveCount(0);
  expect(submissions).toBe(1);
});

test('reports an API permission failure without applying the decision', async ({
  page,
}) => {
  await page.route(detailApi, (route) => route.fulfill({ json: reviewRun }));
  await page.route(decisionsApi, (route) =>
    route.fulfill({ status: 403, json: { code: 'forbidden' } }),
  );

  await page.goto(detailPath);
  await page.getByRole('button', { name: 'Approve version' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Your account does not have permission to review this run.',
  );
  await expect(page.locator('.timeline li[aria-current="step"]')).toContainText(
    'Awaiting review',
  );
  await expect(page.getByText('Approved', { exact: true })).toHaveCount(0);
});
