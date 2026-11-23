import { createFeature, createReducer, on } from '@ngrx/store';
import type { ReadState, RunDetail, RunPage } from '../domain/runs';
import { RunsActions } from './runs.actions';

interface RunsState {
  page: ReadState<RunPage>;
  run: ReadState<RunDetail>;
}

const initialState: RunsState = {
  page: { kind: 'loading' },
  run: { kind: 'loading' },
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
  ),
});
