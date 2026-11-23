import type { components } from './contract.generated';

type Schemas = components['schemas'];
export type RunStatus = Schemas['RunStatus'];
export type RunSummary = Schemas['RunSummary'];
export type RunDetail = Schemas['RunDetail'];
export type RunPage = Schemas['RunPage'];
export type CiEvidence = Schemas['CiEvidence'];
export type Publication = Schemas['Publication'];
export type DecisionInput = Schemas['DecisionInput'];

export interface RunQuery {
  status?: RunStatus;
  cursor?: string;
}

export type ReadError =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'invalid_request'
  | 'unavailable';

export type ReadResult<T> =
  { kind: 'ready'; value: T } | { kind: 'error'; reason: ReadError };

export type ReadState<T> = { kind: 'loading' } | ReadResult<T>;

export type DecisionResult =
  | { kind: 'accepted' }
  | {
      kind: 'refresh';
      reason:
        | 'stale_feature_hash'
        | 'review_closed'
        | 'not_found'
        | 'outcome_unknown';
    }
  | {
      kind: 'blocked';
      reason: 'unauthenticated' | 'forbidden' | 'invalid_request';
    };

export type DecisionState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'resolved'; result: DecisionResult };
