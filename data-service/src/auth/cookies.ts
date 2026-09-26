import type { CookieOptions, Response } from 'express';

/*
 * Paths are browser paths on the admin host, where `edge` serves `api`'s
 * `/auth/*` at `/api/auth/*` — not this service's own routes (FR-AUTH-3, 8).
 * No `Domain`: every cookie is host-only.
 */
const COOKIES = {
  access: { name: 'access_token', path: '/api' },
  refresh: { name: 'refresh_token', path: '/api/auth' },
  state: { name: 'oauth_state', path: '/api/auth', maxAge: 10 * 60 * 1000 },
} as const;

export type AuthCookie = keyof typeof COOKIES;

export const cookieName = (cookie: AuthCookie): string => COOKIES[cookie].name;

function options(cookie: AuthCookie): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: COOKIES[cookie].path,
  };
}

/** The one setter. */
export function setCookie(
  res: Response,
  cookie: AuthCookie,
  value: string,
): void {
  // Q19 undecided: access and refresh carry no Expires / Max-Age, so both
  // are browser-session cookies until open question 19 is answered.
  const spec = COOKIES[cookie];
  res.cookie(spec.name, value, {
    ...options(cookie),
    ...('maxAge' in spec && { maxAge: spec.maxAge }),
  });
}

/** The one clearer, with the setter's attributes so the browser matches it. */
export function clearCookie(res: Response, cookie: AuthCookie): void {
  res.clearCookie(COOKIES[cookie].name, options(cookie));
}

export function setSessionCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  setCookie(res, 'access', accessToken);
  setCookie(res, 'refresh', refreshToken);
}

export function clearSessionCookies(res: Response): void {
  clearCookie(res, 'access');
  clearCookie(res, 'refresh');
}
