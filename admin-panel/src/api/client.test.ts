import { beforeEach, expect, test, vi } from 'vitest';

/*
 * FR-AUTH-20, against a scripted server: each path answers from its own queue
 * of statuses, in order, and every request is recorded.
 */

const goToSignIn = vi.hoisted(() => vi.fn());
vi.mock('../auth/navigation', () => ({ goToSignIn }));

const REFRESH = '/api/auth/refresh';

let calls: string[];

function serve(script: Record<string, number[]>) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((path: string) => {
      calls.push(path);
      const status = script[path]?.shift();
      if (status === undefined) throw new Error(`unscripted request: ${path}`);
      return Promise.resolve(
        status === 200
          ? Response.json({ path })
          : new Response(null, { status }),
      );
    }),
  );
}

const count = (path: string) => calls.filter((p) => p === path).length;

/* A fresh module per test: the in-flight refresh is module state, and the
   sign-in case leaves it pending on purpose. */
let adminApi: typeof import('./client').adminApi;
let authApi: typeof import('./client').authApi;

beforeEach(async () => {
  vi.resetModules();
  goToSignIn.mockClear();
  ({ adminApi, authApi } = await import('./client'));
});

test('concurrent 401s share one refresh, and each request is retried once', async () => {
  serve({
    '/api/admin/me': [401, 200],
    '/api/admin/portfolio': [401, 200],
    '/api/admin/integrations': [401, 200],
    [REFRESH]: [204],
  });

  await Promise.all([
    adminApi.me(),
    adminApi.portfolio(),
    adminApi.integrations(),
  ]);

  expect(count(REFRESH)).toBe(1);
  expect(count('/api/admin/me')).toBe(2);
  expect(count('/api/admin/portfolio')).toBe(2);
  expect(count('/api/admin/integrations')).toBe(2);
  expect(goToSignIn).not.toHaveBeenCalled();
});

test('a retried request that 401s again is not refreshed a second time', async () => {
  serve({ '/api/admin/me': [401, 401], [REFRESH]: [204] });

  await expect(adminApi.me()).rejects.toMatchObject({
    kind: 'unauthorized',
    status: 401,
  });

  expect(count('/api/admin/me')).toBe(2);
  expect(count(REFRESH)).toBe(1);
  expect(goToSignIn).not.toHaveBeenCalled();
});

test('a refresh that answers 401 sends the tenant to sign-in, with no retry', async () => {
  serve({ '/api/admin/me': [401], [REFRESH]: [401] });

  /* Not awaited: the request is left pending while the page is replaced. */
  void adminApi.me();

  await vi.waitFor(() => {
    expect(goToSignIn).toHaveBeenCalledTimes(1);
  });
  expect(count('/api/admin/me')).toBe(1);
  expect(count(REFRESH)).toBe(1);
});

test('logout-all that 401s is refreshed and retried', async () => {
  serve({ '/api/auth/logout-all': [401, 204], [REFRESH]: [204] });

  await expect(authApi.logoutAll()).resolves.toBeUndefined();

  expect(calls).toEqual([
    '/api/auth/logout-all',
    REFRESH,
    '/api/auth/logout-all',
  ]);
});
