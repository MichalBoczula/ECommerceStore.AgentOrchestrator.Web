import { Component, input } from '@angular/core';
import type { CiEvidence, Publication } from '../../domain/runs';
import { StatusBadge } from '../status-badge/status-badge';
import { webLink } from '../web-link';

const reasonMessages: Record<string, string> = {
  already_on_main: 'The approved feature already exists on main.',
  allure_artifact_missing: 'The expected Allure artifact is unavailable.',
  playwright_failed: 'The Playwright step reported a failure.',
  playwright_interrupted:
    'The workflow ended before Playwright evidence could be recorded.',
  playwright_not_run: 'The Playwright step did not run.',
  scenario_skipped: 'Playwright skipped the catalog-to-details scenario.',
  storefront_skipped: 'GitHub Actions skipped the storefront job.',
};

@Component({
  selector: 'app-ci-panel',
  imports: [StatusBadge],
  templateUrl: './ci-panel.html',
})
export class CiPanel {
  readonly publication = input<Publication>();
  readonly ci = input<CiEvidence>();
  protected readonly webLink = webLink;
  protected readonly reasonMessages = reasonMessages;
}
