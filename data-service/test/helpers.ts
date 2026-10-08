import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';

export async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  setupApp(app);
  await app.init();
  return app;
}

let fresh = 0;
/** A well-formed user id that names no seeded user. */
export const freshUserId = (): string =>
  `5eed00000000000001ee${(++fresh).toString(16).padStart(4, '0')}`;

export interface SetCookie {
  readonly value: string;
  /** Everything after the value, lower-cased: `path=/api`, `httponly`, … */
  readonly attributes: readonly string[];
}

/** The response's `Set-Cookie` headers, by cookie name. */
export function setCookies(res: {
  headers: Record<string, unknown>;
}): Record<string, SetCookie> {
  const headers = (res.headers['set-cookie'] ?? []) as string[];
  const cookies: Record<string, SetCookie> = {};
  for (const header of headers) {
    const [pair, ...attributes] = header.split('; ');
    const eq = pair.indexOf('=');
    cookies[pair.slice(0, eq)] = {
      value: decodeURIComponent(pair.slice(eq + 1)),
      attributes: attributes.map((attribute) => attribute.toLowerCase()),
    };
  }
  return cookies;
}

export function maxAge(cookie: SetCookie): number {
  const attribute = cookie.attributes.find((a) => a.startsWith('max-age='));
  return Number(attribute?.slice('max-age='.length));
}

/** FR-AUTH-3: both cleared, each with its own `Path` and `Max-Age=0`. */
export function expectSessionCookiesCleared(res: {
  headers: Record<string, unknown>;
}): void {
  const cookies = setCookies(res);
  expect(cookies.of_at.value).toBe('');
  expect(cookies.of_at.attributes).toEqual(
    expect.arrayContaining(['path=/api', 'max-age=0']),
  );
  expect(cookies.of_rt.value).toBe('');
  expect(cookies.of_rt.attributes).toEqual(
    expect.arrayContaining(['path=/api/auth', 'max-age=0']),
  );
}

/** The attributes every cookie of the auth surface carries (FR-AUTH-3, FR-AUTH-8). */
export function expectHostOnlyHardened(cookie: SetCookie): void {
  expect(cookie.attributes).toEqual(
    expect.arrayContaining(['httponly', 'secure', 'samesite=lax']),
  );
  expect(cookie.attributes.some((a) => a.startsWith('domain'))).toBe(false);
}
