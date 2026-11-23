import { DatePipe } from '@angular/common';
import { Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RunsFacade } from '../../application/runs.facade';
import { CiPanel } from '../ci-panel/ci-panel';
import { ReadError } from '../read-error/read-error';
import { StatusBadge } from '../status-badge/status-badge';
import { webLink } from '../web-link';

@Component({
  imports: [DatePipe, RouterLink, CiPanel, ReadError, StatusBadge],
  templateUrl: './run-detail.html',
})
export class RunDetailPage {
  readonly runId = input.required<string>();
  private readonly facade = inject(RunsFacade);
  protected readonly run = this.facade.run;
  protected readonly webLink = webLink;

  constructor() {
    effect(() => this.reload());
  }

  protected reload(): void {
    this.facade.loadRun(this.runId());
  }
}
