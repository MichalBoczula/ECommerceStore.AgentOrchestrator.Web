import { createActionGroup, props } from '@ngrx/store';
import type {
  DecisionInput,
  DecisionResult,
  ReadResult,
  RunDetail,
  RunPage,
  RunQuery,
} from '../domain/runs';

export const RunsActions = createActionGroup({
  source: 'Runs',
  events: {
    'List requested': props<{ query: RunQuery }>(),
    'List resolved': props<{ result: ReadResult<RunPage> }>(),
    'Detail requested': props<{ runId: string }>(),
    'Detail resolved': props<{ result: ReadResult<RunDetail> }>(),
    'Decision requested': props<{ runId: string; decision: DecisionInput }>(),
    'Decision resolved': props<{
      result: DecisionResult;
      refreshedRun?: ReadResult<RunDetail>;
    }>(),
  },
});
