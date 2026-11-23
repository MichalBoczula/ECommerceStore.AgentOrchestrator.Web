import { DatePipe } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { RunsFacade } from '../../application/runs.facade';
import type { RunQuery } from '../../domain/runs';
import { ReadError } from '../read-error/read-error';
import {
  isRunStatus,
  runStatusOptions,
  StatusBadge,
} from '../status-badge/status-badge';

@Component({
  imports: [DatePipe, RouterLink, ReadError, StatusBadge],
  templateUrl: './run-list.html',
})
export class RunList {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(RunsFacade);
  protected readonly page = this.facade.page;
  protected readonly statusOptions = runStatusOptions;

  protected readonly query = toSignal(
    this.route.queryParamMap.pipe(
      map((params): RunQuery => {
        const status = params.get('status');
        return {
          status: isRunStatus(status) ? status : undefined,
          cursor: params.get('cursor') || undefined,
        };
      }),
    ),
    { requireSync: true },
  );

  constructor() {
    effect(() => this.facade.loadPage(this.query()));
  }

  protected changeStatus(value: string): void {
    this.navigate({ status: isRunStatus(value) ? value : undefined });
  }

  protected openPage(cursor?: string): void {
    this.navigate({ status: this.query().status, cursor });
  }

  protected reload(): void {
    this.facade.loadPage(this.query());
  }

  private navigate(query: RunQuery): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: query,
    });
  }
}
