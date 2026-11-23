import { Component, computed, input, output } from '@angular/core';
import type { ReadError as ReadErrorReason } from '../../domain/runs';

const messages: Record<ReadErrorReason, { heading: string; body: string }> = {
  unauthenticated: {
    heading: 'Sign-in required',
    body: 'Sign in with an account that has permission to read runs.',
  },
  forbidden: {
    heading: 'Access denied',
    body: 'Your account does not have permission to read these runs.',
  },
  not_found: {
    heading: 'Run unavailable',
    body: 'The run could not be found or is outside your account’s access.',
  },
  invalid_request: {
    heading: 'Invalid request',
    body: 'Check the run link or return to the first page of results.',
  },
  unavailable: {
    heading: 'Unable to load',
    body: 'The orchestrator API could not return the requested data.',
  },
};

@Component({
  selector: 'app-read-error',
  template: `
    <div class="empty-panel" role="alert">
      <p class="state-title">{{ message().heading }}</p>
      <p>{{ message().body }}</p>
      <button type="button" class="button" (click)="retry.emit()">
        Try again
      </button>
    </div>
  `,
})
export class ReadError {
  readonly reason = input.required<ReadErrorReason>();
  readonly retry = output<void>();
  protected readonly message = computed(() => messages[this.reason()]);
}
