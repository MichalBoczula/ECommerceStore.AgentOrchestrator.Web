import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import type { paths } from '../domain/contract.generated';
import { RunsRepository } from '../domain/runs-repository.port';
import type {
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
