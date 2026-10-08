import type { IncomingMessage, ServerResponse } from 'node:http';
import { parse, serialize } from 'cookie';

/*
 * The three cookies of the auth surface. Paths are the browser's, so they
 * carry the `/api` prefix `edge` strips before a request reaches this
 * service (§7.4). None carries `Domain`: all are host-only (FR-AUTH-3).
 */
export const ACCESS_COOKIE = { name: 'of_at', path: '/api' } as const;
export const REFRESH_COOKIE = { name: 'of_rt', path: '/api/auth' } as const;
/** FR-AUTH-8. The SRS fixes its attributes but not its name. */
export const STATE_COOKIE = { name: 'of_oauth', path: '/api/auth' } as const;
export const STATE_MAX_AGE_SECONDS = 600;

type CookieSpec = { readonly name: string; readonly path: string };

export function readCookie(
  request: IncomingMessage,
  { name }: CookieSpec,
): string | undefined {
  return parse(request.headers.cookie ?? '')[name];
}

export function setCookie(
  response: ServerResponse,
  { name, path }: CookieSpec,
  value: string,
  maxAge: number,
): void {
  response.appendHeader(
    'Set-Cookie',
    serialize(name, value, {
      path,
      maxAge,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    }),
  );
}

/** Same name, `Path` and attributes, `Max-Age=0` (FR-AUTH-3). */
export function clearCookie(response: ServerResponse, spec: CookieSpec): void {
  setCookie(response, spec, '', 0);
}
