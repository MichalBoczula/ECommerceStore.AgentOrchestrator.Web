import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, switchMap, takeUntil } from 'rxjs';
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
}
