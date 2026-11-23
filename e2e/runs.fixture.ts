import type {
  RunDetail,
  RunSummary,
} from '../src/app/features/runs/domain/runs';

const createdAt = '2026-11-22T12:00:00Z';
const reviewedAt = '2026-11-22T12:00:05Z';
const completedAt = '2026-11-22T12:01:00Z';
const runId = '10000000-0000-4000-8000-000000000003';
const approvedHead = 'a'.repeat(40);
export const feature = [
  'Feature: Browse smartphone details',
  '',
  '  Scenario: Open a listed smartphone and verify its details',
  '    Given the smartphone catalog is open',
  '    When I open a listed smartphone',
  '    Then the details match the selected smartphone',
  '',
].join('\n');

export const reviewRun: RunDetail = {
  runId,
  jiraIssueKey: 'DEMO-101',
  status: 'awaiting_review',
  createdAt,
  updatedAt: reviewedAt,
  input: {
    baSessionId: '10000000-0000-4000-8000-000000000001',
    baRunId: '10000000-0000-4000-8000-000000000002',
    criterionIndex: 0,
  },
  handoff: {
    jiraIssueKey: 'DEMO-101',
    snapshotId: 'demo-catalog-v1',
    evidenceExchangeId: '10000000-0000-4000-8000-000000000004',
    approvedAt: '2026-11-22T11:50:00Z',
    publishedAt: '2026-11-22T11:55:00Z',
    draftSha256: 'b'.repeat(64),
    service: 'products',
    method: 'GET',
    path: '/mobile-phones',
    criterion: {
      title: 'View details for a listed phone',
      given: 'The smartphone catalog is open',
      when: 'I select a listed smartphone',
      then: 'The details match the selected phone and include its specifications',
      sourceIds: ['catalog-get'],
    },
    sources: [
      {
        id: 'catalog-get',
        title: 'Products Catalog GET contract',
        path: 'sources/openapi.json#/paths/~1mobile-phones/get',
        commitSha: approvedHead,
        url: 'https://github.com/example/products/blob/main/openapi.json',
      },
    ],
  },
  review: {
    qaSessionId: '10000000-0000-4000-8000-000000000005',
    proposalId: '10000000-0000-4000-8000-000000000006',
    path: 'features/catalog/browse-phone-details.feature',
    featureSha256: 'c'.repeat(64),
    feature,
  },
  history: [
    { status: 'queued', at: createdAt },
    { status: 'validating_handoff', at: '2026-11-22T12:00:01Z' },
    { status: 'authoring_proposal', at: '2026-11-22T12:00:02Z' },
    { status: 'awaiting_review', at: reviewedAt },
  ],
};

export const completedRun: RunDetail = {
  ...reviewRun,
  status: 'completed',
  updatedAt: completedAt,
  history: [
    ...reviewRun.history,
    { status: 'publishing', at: '2026-11-22T12:00:12Z' },
    { status: 'awaiting_ci', at: '2026-11-22T12:00:20Z' },
    { status: 'completed', at: completedAt },
  ],
  publication: {
    outcome: 'pull_request',
    repository: 'example/storefront-e2e',
    url: 'https://github.com/example/storefront-e2e/pull/21',
    commitSha: approvedHead,
    pullRequestNumber: 21,
    branch: 'qa/catalog',
  },
  ci: {
    status: 'passed',
    gherkinCheckStatus: 'passed',
    workflowRunId: 9001,
    workflowRunUrl:
      'https://github.com/example/storefront-e2e/actions/runs/9001',
    runAttempt: 2,
    storefrontJobId: 9002,
    observedHeadSha: approvedHead,
    testedCommitSha: 'b'.repeat(40),
    currentHeadSha: 'c'.repeat(40),
    allureArtifact: {
      id: 9003,
      name: 'storefront-test-results-attempt-2',
      url: 'https://github.com/example/storefront-e2e/actions/runs/9001/artifacts/9003',
    },
  },
};

export function runSummary({
  runId,
  jiraIssueKey,
  status,
  createdAt,
  updatedAt,
}: RunSummary): RunSummary {
  return { runId, jiraIssueKey, status, createdAt, updatedAt };
}
