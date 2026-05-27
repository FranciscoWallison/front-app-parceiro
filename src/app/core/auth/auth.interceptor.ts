import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/biometric/login',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(TokenStorageService);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (isPublic(req.url)) return next(req);

  return from(storage.getAccessToken()).pipe(
    switchMap((token) => {
      const authed = token ? withAuth(req, token) : req;
      return next(authed).pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status !== 401 || !token) return throwError(() => err);
          return from(authService.refreshTokens()).pipe(
            switchMap((tokens) =>
              next(withAuth(req, tokens.accessToken)).pipe(
                catchError((err2: HttpErrorResponse) => {
                  if (err2.status === 401) handleSessionExpired(authService, router);
                  return throwError(() => err2);
                }),
              ),
            ),
            catchError((refreshErr) => {
              handleSessionExpired(authService, router);
              return throwError(() => refreshErr);
            }),
          );
        }),
      );
    }),
  );
};

function isPublic(url: string): boolean {
  return PUBLIC_PATHS.some((p) => url.endsWith(p) || url.includes(`${p}?`));
}

function withAuth(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handleSessionExpired(authService: AuthService, router: Router): void {
  void authService.logout().finally(() => void router.navigate(['/login']));
}
