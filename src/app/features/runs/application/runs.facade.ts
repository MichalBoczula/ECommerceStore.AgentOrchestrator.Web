import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import type { RunQuery } from '../domain/runs';
import { RunsActions } from '../state/runs.actions';
import { runsFeature } from '../state/runs.feature';

@Injectable()
export class RunsFacade {
  private readonly store = inject(Store);
  readonly page = this.store.selectSignal(runsFeature.selectPage);
  readonly run = this.store.selectSignal(runsFeature.selectRun);

  loadPage(query: RunQuery): void {
    this.store.dispatch(RunsActions.listRequested({ query }));
  }

  loadRun(runId: string): void {
    this.store.dispatch(RunsActions.detailRequested({ runId }));
  }
}
