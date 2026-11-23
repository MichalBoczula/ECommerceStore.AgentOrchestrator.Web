import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RunsFacade } from '../../application/runs.facade';
import type { DecisionInput, DecisionResult } from '../../domain/runs';
import { CiPanel } from '../ci-panel/ci-panel';
import { ReadError } from '../read-error/read-error';
import { RunReview } from '../run-review/run-review';
import { StatusBadge } from '../status-badge/status-badge';
import { webLink } from '../web-link';

type DecisionReason = Exclude<DecisionResult, { kind: 'accepted' }>['reason'];
const decisionMessages: Record<DecisionReason, string> = {
  stale_feature_hash:
    'The Gherkin version changed. Review the refreshed proposal before deciding again.',
  review_closed: 'A decision was already recorded for this review.',
  not_found: 'This run is no longer available for review.',
  outcome_unknown:
    'The decision outcome could not be confirmed. Check the latest run state before deciding again.',
  unauthenticated:
    'Sign in with an account that has permission to review this run.',
  forbidden: 'Your account does not have permission to review this run.',
  invalid_request:
    'The API rejected the decision. Check the version and the rejection reason.',
};

@Component({
  imports: [DatePipe, RouterLink, CiPanel, ReadError, RunReview, StatusBadge],
  templateUrl: './run-detail.html',
})
export class RunDetailPage {
  readonly runId = input.required<string>();
  private readonly facade = inject(RunsFacade);
  protected readonly run = this.facade.run;
  protected readonly webLink = webLink;
  protected readonly submitting = computed(
    () => this.facade.decision().kind === 'submitting',
  );
  protected readonly decisionFeedback = computed(() => {
    const decision = this.facade.decision();
    if (decision.kind !== 'resolved') return undefined;
    const { result } = decision;
    return result.kind === 'accepted'
      ? { kind: result.kind, text: 'Decision recorded.' }
      : { kind: result.kind, text: decisionMessages[result.reason] };
  });

  constructor() {
    effect(() => this.facade.loadRun(this.runId()));
  }

  protected reload(): void {
    if (!this.submitting()) this.facade.loadRun(this.runId());
  }

  protected decide(runId: string, input: DecisionInput): void {
    this.facade.decide(runId, input);
  }
}
