import { http, HttpResponse } from 'msw';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  test,
  vi,
} from 'vitest';
import {
  browserHolds,
  calls,
  count,
  ME,
  REFRESH,
  server,
  TENANTS,
} from '../test/auth-server';

/*
 * FR-AUTH-20, against the MSW handlers of `src/test/auth-server.ts`.
 */

const goToSignIn = vi.hoisted(() => vi.fn());
vi.mock('../auth/navigation', () => ({ goToSignIn }));

beforeAll(() => {
  /* Drop the setup file's offline `fetch` so MSW patches the real one. Node's
     `fetch` takes no relative URL, so the app's are resolved as a browser
     would, before MSW sees them. */
  vi.unstubAllGlobals();
  server.listen({ onUnhandledRequest: 'error' });
  const intercepted = globalThis.fetch;
  vi.stubGlobal('fetch', (path: string, init?: RequestInit) =>
    intercepted(new URL(path, window.location.origin), init),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

/* A fresh module per test: the in-flight refresh is module state, and the
   sign-in cases leave it pending on purpose. */
let adminApi: typeof import('./client').adminApi;
let authApi: typeof import('./client').authApi;

beforeEach(async () => {
  vi.resetModules();
  goToSignIn.mockClear();
  browserHolds(TENANTS.alice);
  window.history.replaceState(null, '', '/sections/projects?tab=1');
  ({ adminApi, authApi } = await import('./client'));
});

test('an expired access JWT costs one refresh, then the request succeeds', async () => {
  await expect(adminApi.me()).resolves.toEqual(ME);

  expect(calls.map((call) => call.request)).toEqual([
    'GET /api/admin/me',
    `POST ${REFRESH}`,
    'GET /api/admin/me',
  ]);
  expect(goToSignIn).not.toHaveBeenCalled();
});

test('concurrent 401s share one refresh, and each request is retried once', async () => {
  await Promise.all([adminApi.me(), adminApi.portfolio()]);

  expect(count(`POST ${REFRESH}`)).toBe(1);
  expect(count('GET /api/admin/me')).toBe(2);
  expect(count('GET /api/admin/portfolio')).toBe(2);
  expect(goToSignIn).not.toHaveBeenCalled();
});

test('the retry carries the original body', async () => {
  const body = { content: { name: 'Alice' }, enabled: true };

  await adminApi.updateSection('hero', body, 3);

  expect(
    calls.filter((call) => call.request.startsWith('PATCH')).map((c) => c.body),
  ).toEqual([body, body]);
});

test('a retried request that 401s again ends the session, with no second refresh', async () => {
  /* A refresh that succeeds and an access JWT that still does not verify. */
  server.use(
    http.post(REFRESH, () => {
      calls.push({ request: `POST ${REFRESH}`, body: undefined });
      return new HttpResponse(null, { status: 204 });
    }),
  );

  /* Not awaited: the request is left pending while the page is replaced. */
  void adminApi.me();

  await vi.waitFor(() => {
    expect(goToSignIn).toHaveBeenCalledTimes(1);
  });
  expect(goToSignIn).toHaveBeenCalledWith();
  expect(count('GET /api/admin/me')).toBe(2);
  expect(count(`POST ${REFRESH}`)).toBe(1);
});

test('a refresh that answers 401 sends the tenant to sign-in, with no returnTo and no retry', async () => {
  browserHolds(TENANTS.dave);

  void adminApi.me();

  await vi.waitFor(() => {
    expect(goToSignIn).toHaveBeenCalledTimes(1);
  });
  expect(goToSignIn).toHaveBeenCalledWith();
  expect(count('GET /api/admin/me')).toBe(1);
  expect(count(`POST ${REFRESH}`)).toBe(1);
});

test.each([
  [429, 'rate_limited'],
  [503, 'server'],
  ['offline', 'network'],
] as const)(
  'a refresh that fails with %s is reported and signs nobody out',
  async (refresh, kind) => {
    browserHolds({ access: false, refresh });

    await expect(adminApi.me()).rejects.toMatchObject({ kind });

    expect(count('GET /api/admin/me')).toBe(1);
    expect(goToSignIn).not.toHaveBeenCalled();
  },
);

test('a 403 is an error, not a refresh', async () => {
  server.use(
    http.get('/api/admin/me', () => new HttpResponse(null, { status: 403 })),
  );

  await expect(adminApi.me()).rejects.toMatchObject({ status: 403 });

  expect(count(`POST ${REFRESH}`)).toBe(0);
  expect(goToSignIn).not.toHaveBeenCalled();
});

test('logout-all that 401s is refreshed and retried', async () => {
  await expect(authApi.logoutAll()).resolves.toBeUndefined();

  expect(calls.map((call) => call.request)).toEqual([
    'POST /api/auth/logout-all',
    `POST ${REFRESH}`,
    'POST /api/auth/logout-all',
  ]);
});

test('logout is sent once and never refreshed', async () => {
  await expect(authApi.logout()).resolves.toBeUndefined();

  expect(calls.map((call) => call.request)).toEqual(['POST /api/auth/logout']);
});
