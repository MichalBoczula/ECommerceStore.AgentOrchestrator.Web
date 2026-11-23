import { Component, computed, input } from '@angular/core';
import type { CiEvidence, RunStatus } from '../../domain/runs';

type Tone =
  'neutral' | 'active' | 'review' | 'complete' | 'positive' | 'negative';
type BadgeStatus =
  RunStatus | CiEvidence['status'] | CiEvidence['gherkinCheckStatus'];
type Badge = { label: string; tone: Tone };

const runBadges: Record<RunStatus, Badge> = {
  queued: { label: 'Queued', tone: 'neutral' },
  validating_handoff: { label: 'Validating handoff', tone: 'active' },
  authoring_proposal: { label: 'Authoring proposal', tone: 'active' },
  awaiting_review: { label: 'Awaiting review', tone: 'review' },
  rejected: { label: 'Rejected', tone: 'negative' },
  publishing: { label: 'Publishing', tone: 'active' },
  awaiting_ci: { label: 'Awaiting CI', tone: 'active' },
  completed: { label: 'Completed', tone: 'complete' },
  failed: { label: 'Failed', tone: 'negative' },
};

const badges: Record<BadgeStatus, Badge> = {
  ...runBadges,
  pending: { label: 'Pending', tone: 'active' },
  passed: { label: 'Passed', tone: 'positive' },
  not_run: { label: 'Not run', tone: 'neutral' },
  evidence_missing: { label: 'Evidence missing', tone: 'review' },
  not_applicable: { label: 'Not applicable', tone: 'neutral' },
};

export const runStatusOptions = (Object.keys(runBadges) as RunStatus[]).map(
  (value) => ({
    value,
    label: runBadges[value].label,
  }),
);

export function isRunStatus(value: string | null): value is RunStatus {
  return value !== null && Object.hasOwn(runBadges, value);
}

@Component({
  selector: 'app-status-badge',
  template: `
    <span class="status-badge" [attr.data-tone]="badge().tone">
      <span class="status-dot" aria-hidden="true"></span>
      {{ badge().label }}
    </span>
  `,
})
export class StatusBadge {
  readonly status = input.required<BadgeStatus>();
  protected readonly badge = computed(
    () => badges[this.status()] ?? { label: 'Unknown status', tone: 'neutral' },
  );
}
