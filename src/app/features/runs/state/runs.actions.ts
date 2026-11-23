import { createActionGroup, props } from '@ngrx/store';
import type { ReadResult, RunDetail, RunPage, RunQuery } from '../domain/runs';

export const RunsActions = createActionGroup({
  source: 'Runs',
  events: {
    'List requested': props<{ query: RunQuery }>(),
    'List resolved': props<{ result: ReadResult<RunPage> }>(),
    'Detail requested': props<{ runId: string }>(),
    'Detail resolved': props<{ result: ReadResult<RunDetail> }>(),
  },
});
