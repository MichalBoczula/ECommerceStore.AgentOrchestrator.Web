import { Component, computed, input, output, signal } from '@angular/core';
import type { DecisionInput } from '../../domain/runs';

const maxReasonLength = 2000;

@Component({
  selector: 'app-run-review',
  templateUrl: './run-review.html',
  styleUrl: './run-review.scss',
})
export class RunReview {
  readonly featureSha256 = input.required<string>();
  readonly submitting = input.required<boolean>();
  readonly decided = output<DecisionInput>();
  protected readonly reason = signal('');
  protected readonly cleanReason = computed(() => this.reason().trim());
  protected readonly reasonTooLong = computed(
    () => [...this.cleanReason()].length > maxReasonLength,
  );

  protected approve(): void {
    if (this.submitting()) return;
    this.decided.emit({
      decision: 'approve',
      expectedFeatureSha256: this.featureSha256(),
    });
  }

  protected reject(event: Event): void {
    event.preventDefault();
    const reason = this.cleanReason();
    if (this.submitting() || !reason || this.reasonTooLong()) return;
    this.decided.emit({
      decision: 'reject',
      expectedFeatureSha256: this.featureSha256(),
      reason,
    });
  }
}
