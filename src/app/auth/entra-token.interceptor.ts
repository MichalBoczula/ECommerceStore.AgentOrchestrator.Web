import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { EntraSession } from './entra-session';

export const entraTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(EntraSession);
  if (
    session.status() === 'disabled' ||
    !/^\/api\/v1\/runs(?:[/?]|$)/.test(request.url)
  ) {
    return next(request);
  }

  return from(session.accessToken()).pipe(
    switchMap((token) =>
      next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })),
    ),
  );
};
