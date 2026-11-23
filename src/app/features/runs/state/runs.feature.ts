import { createFeature, createReducer, on } from '@ngrx/store';
import type {
  DecisionState,
  ReadState,
  RunDetail,
  RunPage,
} from '../domain/runs';
import { RunsActions } from './runs.actions';

interface RunsState {
  page: ReadState<RunPage>;
  run: ReadState<RunDetail>;
  decision: DecisionState;
}

const initialState: RunsState = {
  page: { kind: 'loading' },
  run: { kind: 'loading' },
  decision: { kind: 'idle' },
};

export const runsFeature = createFeature({
  name: 'runs',
  reducer: createReducer(
    initialState,
    on(
      RunsActions.listRequested,
      RunsActions.detailRequested,
      () => initialState,
    ),
    on(RunsActions.listResolved, (state, { result }) => ({
      ...state,
      page: result,
    })),
    on(RunsActions.detailResolved, (state, { result }) => ({
      ...state,
      run: result,
    })),
    on(RunsActions.decisionRequested, (state): RunsState => ({
      ...state,
      decision: { kind: 'submitting' },
    })),
    on(
      RunsActions.decisionResolved,
      (state, { result, refreshedRun }): RunsState => ({
        ...state,
        run: refreshedRun ?? state.run,
        decision: { kind: 'resolved', result },
      }),
    ),
  ),
});
