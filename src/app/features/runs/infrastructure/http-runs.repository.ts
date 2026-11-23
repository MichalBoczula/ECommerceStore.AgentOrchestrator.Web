import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import type { components, paths } from '../domain/contract.generated';
import { RunsRepository } from '../domain/runs-repository.port';
import type {
  DecisionInput,
  DecisionResult,
  ReadError,
  ReadResult,
  RunDetail,
  RunPage,
  RunQuery,
} from '../domain/runs';

const runsPath = '/api/v1/runs' satisfies keyof paths;
type ListResponse =
  paths[typeof runsPath]['get']['responses'][200]['content']['application/json'];
type DetailResponse =
  paths['/api/v1/runs/{runId}']['get']['responses'][200]['content']['application/json'];
type DecisionResponse =
  paths['/api/v1/runs/{runId}/decisions']['post']['responses'][202]['content']['application/json'];
type Problem = components['schemas']['Problem'];

const readErrors: Partial<Record<number, ReadError>> = {
  400: 'invalid_request',
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'not_found',
};

@Injectable()
export class HttpRunsRepository implements RunsRepository {
  private readonly http = inject(HttpClient);

  list({ status, cursor }: RunQuery): Observable<ReadResult<RunPage>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (cursor) params = params.set('cursor', cursor);
    return this.read(this.http.get<ListResponse>(runsPath, { params }));
  }

  get(runId: string): Observable<ReadResult<RunDetail>> {
    const response = this.http.get<DetailResponse>(
      runsPath + '/' + encodeURIComponent(runId),
    );
    return this.read(
      response.pipe(
        map((run) => {
          if (run.runId.toLowerCase() !== runId.toLowerCase()) {
            throw new Error('The API returned a different run.');
          }
          return run;
        }),
      ),
    );
  }

  decide(runId: string, input: DecisionInput): Observable<DecisionResult> {
    const url = runsPath + '/' + encodeURIComponent(runId) + '/decisions';
    const expectedStatus =
      input.decision === 'approve' ? 'publishing' : 'rejected';
    return this.http
      .post<DecisionResponse>(url, input, { observe: 'response' })
      .pipe(
        map((response): DecisionResult =>
          response.status === 202 &&
          response.body?.runId === runId &&
          response.body.status === expectedStatus
            ? { kind: 'accepted' }
            : { kind: 'refresh', reason: 'outcome_unknown' },
        ),
        catchError((error: unknown) => of(decisionError(error))),
      );
  }

  private read<T>(response: Observable<T>): Observable<ReadResult<T>> {
    return response.pipe(
      map((value): ReadResult<T> => ({ kind: 'ready', value })),
      catchError((error: unknown) => {
        const reason =
          error instanceof HttpErrorResponse
            ? readErrors[error.status]
            : undefined;
        return of({ kind: 'error', reason: reason ?? 'unavailable' } as const);
      }),
    );
  }
}

function decisionError(error: unknown): DecisionResult {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 409) {
      const reason = (error.error as Partial<Problem> | null)?.code;
      if (reason === 'stale_feature_hash' || reason === 'review_closed') {
        return { kind: 'refresh', reason };
      }
    }

    const reason = readErrors[error.status];
    if (reason === 'not_found') return { kind: 'refresh', reason };
    if (
      reason === 'unauthenticated' ||
      reason === 'forbidden' ||
      reason === 'invalid_request'
    ) {
      return { kind: 'blocked', reason };
    }
  }
  return { kind: 'refresh', reason: 'outcome_unknown' };
}
