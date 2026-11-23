import { makeEnvironmentProviders } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { RunsFacade } from './application/runs.facade';
import { RunsRepository } from './domain/runs-repository.port';
import { HttpRunsRepository } from './infrastructure/http-runs.repository';
import { RunsEffects } from './state/runs.effects';
import { runsFeature } from './state/runs.feature';

export function provideRuns() {
  return makeEnvironmentProviders([
    provideState(runsFeature),
    provideEffects(RunsEffects),
    RunsFacade,
    { provide: RunsRepository, useClass: HttpRunsRepository },
  ]);
}
