import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { entraRedirectPath } from './app/auth/entra-session';

if (window.location.pathname === entraRedirectPath) {
  const root = document.querySelector('app-root');
  root?.replaceChildren('Completing sign-in…');
  void import('@azure/msal-browser/redirect-bridge')
    .then(({ broadcastResponseToMainFrame }) => broadcastResponseToMainFrame())
    .catch(() =>
      root?.replaceChildren(
        'Sign-in could not be completed. Return to the panel and try again.',
      ),
    );
} else {
  void bootstrapApplication(App, appConfig).catch((error: unknown) =>
    console.error(error),
  );
}
