import { Routes } from '@angular/router';
import { provideRuns } from './features/runs/runs.providers';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'runs' },
  {
    path: 'runs',
    providers: [provideRuns()],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Workflow runs · Agent Orchestrator',
        loadComponent: () =>
          import('./features/runs/presentation/run-list/run-list').then(
            (m) => m.RunList,
          ),
      },
      {
        path: ':runId',
        title: 'Run details · Agent Orchestrator',
        loadComponent: () =>
          import('./features/runs/presentation/run-detail/run-detail').then(
            (m) => m.RunDetailPage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'runs' },
];
