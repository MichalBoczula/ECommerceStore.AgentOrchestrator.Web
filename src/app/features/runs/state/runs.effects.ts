import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, map, of, switchMap, takeUntil } from 'rxjs';
import { RunsRepository } from '../domain/runs-repository.port';
import { RunsActions } from './runs.actions';

@Injectable()
export class RunsEffects {
  private readonly actions = inject(Actions);
  private readonly repository = inject(RunsRepository);

  readonly list = createEffect(() =>
    this.actions.pipe(
      ofType(RunsActions.listRequested),
      switchMap(({ query }) =>
        this.repository.list(query).pipe(
          takeUntil(this.actions.pipe(ofType(RunsActions.detailRequested))),
          map((result) => RunsActions.listResolved({ result })),
        ),
      ),
    ),
  );

  readonly detail = createEffect(() =>
    this.actions.pipe(
      ofType(RunsActions.detailRequested),
      switchMap(({ runId }) =>
        this.repository.get(runId).pipe(
          takeUntil(this.actions.pipe(ofType(RunsActions.listRequested))),
          map((result) => RunsActions.detailResolved({ result })),
        ),
      ),
    ),
  );

  readonly decide = createEffect(() =>
    this.actions.pipe(
      ofType(RunsActions.decisionRequested),
      exhaustMap(({ runId, decision }) =>
        this.repository.decide(runId, decision).pipe(
          switchMap((result) =>
            result.kind === 'blocked'
              ? of(RunsActions.decisionResolved({ result }))
              : this.repository
                  .get(runId)
                  .pipe(
                    map((refreshedRun) =>
                      RunsActions.decisionResolved({ result, refreshedRun }),
                    ),
                  ),
          ),
          takeUntil(
            this.actions.pipe(
              ofType(RunsActions.listRequested, RunsActions.detailRequested),
            ),
          ),
        ),
      ),
    ),
  );
}
