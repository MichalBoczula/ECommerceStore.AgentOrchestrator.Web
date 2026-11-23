import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import type { DecisionInput, RunQuery } from '../domain/runs';
import { RunsActions } from '../state/runs.actions';
import { runsFeature } from '../state/runs.feature';

@Injectable()
export class RunsFacade {
  private readonly store = inject(Store);
  readonly page = this.store.selectSignal(runsFeature.selectPage);
  readonly run = this.store.selectSignal(runsFeature.selectRun);
  readonly decision = this.store.selectSignal(runsFeature.selectDecision);

  loadPage(query: RunQuery): void {
    this.store.dispatch(RunsActions.listRequested({ query }));
  }

  loadRun(runId: string): void {
    this.store.dispatch(RunsActions.detailRequested({ runId }));
  }

  decide(runId: string, decision: DecisionInput): void {
    const visible = this.run();
    if (
      this.decision().kind === 'submitting' ||
      visible.kind !== 'ready' ||
      visible.value.runId !== runId ||
      visible.value.status !== 'awaiting_review' ||
      visible.value.review?.featureSha256 !== decision.expectedFeatureSha256
    ) {
      return;
    }

    this.store.dispatch(RunsActions.decisionRequested({ runId, decision }));
  }
}
