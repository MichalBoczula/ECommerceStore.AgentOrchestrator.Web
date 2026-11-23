import type { Observable } from 'rxjs';
import type {
  DecisionInput,
  DecisionResult,
  ReadResult,
  RunDetail,
  RunPage,
  RunQuery,
} from './runs';

export abstract class RunsRepository {
  abstract list(query: RunQuery): Observable<ReadResult<RunPage>>;
  abstract get(runId: string): Observable<ReadResult<RunDetail>>;
  abstract decide(
    runId: string,
    input: DecisionInput,
  ): Observable<DecisionResult>;
}
