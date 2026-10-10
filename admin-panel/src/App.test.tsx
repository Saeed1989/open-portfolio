import { fireEvent, render, screen } from '@testing-library/react';
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
  REFRESH,
  server,
  TENANTS,
} from './test/auth-server';

/*
 * FR-AUTH-7 and FR-AUTH-20 at the gate: what a guarded route renders, and
 * where it sends the tenant, for each answer `GET /admin/me` and the refresh
 * can give. Against the MSW handlers of `src/test/auth-server.ts`.
 */

const goToSignIn = vi.hoisted(() => vi.fn());
vi.mock('./auth/navigation', () => ({
  SIGN_IN_PATH: '/sign-in',
  goToSignIn,
}));

beforeAll(() => {
  /* As in `api/client.test.ts`: MSW patches the real `fetch`, and the app's
     relative URLs are resolved as a browser would. */
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

/* A fresh module graph per test: the query cache and the in-flight refresh
   are both module state. */
async function open(path: string): Promise<void> {
  window.history.replaceState(null, '', path);
  const { App } = await import('./App');
  render(<App />);
}

/** Drawn by the dashboard only, so its absence is the gate holding. */
const guarded = () => screen.queryByRole('button', { name: 'Sign out' });

beforeEach(() => {
  vi.resetModules();
  goToSignIn.mockClear();
});

test('no session: /me 401 and refresh 401 go to sign-in, and nothing guarded renders', async () => {
  browserHolds(TENANTS.dave);

  await open('/sections');

  await vi.waitFor(() => {
    expect(goToSignIn).toHaveBeenCalledTimes(1);
  });
  expect(goToSignIn).toHaveBeenCalledWith();
  expect(calls.map((call) => call.request)).toEqual([
    'GET /api/admin/me',
    `POST ${REFRESH}`,
  ]);
  expect(guarded()).toBeNull();
  expect(screen.queryByRole('alert')).toBeNull();
});

test('expired access only: one refresh, one retry, then the route renders', async () => {
  browserHolds(TENANTS.alice);

  await open('/sections');

  expect(await screen.findByRole('button', { name: 'Sign out' })).toBeTruthy();
  expect(count(`POST ${REFRESH}`)).toBe(1);
  expect(count('GET /api/admin/me')).toBe(2);
  expect(goToSignIn).not.toHaveBeenCalled();
});

test('a retry that 401s again goes to sign-in, with no second refresh', async () => {
  browserHolds(TENANTS.dave);
  server.use(
    http.post(REFRESH, () => {
      calls.push({ request: `POST ${REFRESH}`, body: undefined });
      return new HttpResponse(null, { status: 204 });
    }),
  );

  await open('/sections');

  await vi.waitFor(() => {
    expect(goToSignIn).toHaveBeenCalledTimes(1);
  });
  expect(count('GET /api/admin/me')).toBe(2);
  expect(count(`POST ${REFRESH}`)).toBe(1);
  expect(guarded()).toBeNull();
});

test.each([429, 503, 'offline'] as const)(
  'a refresh that fails with %s is an error with a retry, and stays put',
  async (refresh) => {
    browserHolds({ access: false, refresh });

    await open('/sections');

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(guarded()).toBeNull();
    expect(goToSignIn).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/sections');

    /* The session was intact all along: the retry gets through. */
    browserHolds(TENANTS.alice);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByRole('button', { name: 'Sign out' }),
    ).toBeTruthy();
    expect(goToSignIn).not.toHaveBeenCalled();
  },
);

test.each([502, 500])(
  '/me answering %s is an error with a retry, not a sign-out',
  async (status) => {
    browserHolds(TENANTS.alice);
    server.use(
      http.get('/api/admin/me', () => new HttpResponse(null, { status })),
    );

    await open('/sections');

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    expect(count(`POST ${REFRESH}`)).toBe(0);
    expect(goToSignIn).not.toHaveBeenCalled();
  },
);

test('a 403 is an error, with no refresh and no sign-out', async () => {
  browserHolds(TENANTS.alice);
  server.use(
    http.get('/api/admin/me', () => new HttpResponse(null, { status: 403 })),
  );

  await open('/sections');

  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(count(`POST ${REFRESH}`)).toBe(0);
  expect(guarded()).toBeNull();
  expect(goToSignIn).not.toHaveBeenCalled();
});

test('/sign-in is outside the gate and calls nothing', async () => {
  browserHolds(TENANTS.dave);

  await open('/sign-in');

  expect(
    await screen.findByRole('link', { name: 'Sign in with Google' }),
  ).toBeTruthy();
  /* Long enough for a gate, had there been one, to have asked. */
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(calls).toEqual([]);
  expect(goToSignIn).not.toHaveBeenCalled();
});
