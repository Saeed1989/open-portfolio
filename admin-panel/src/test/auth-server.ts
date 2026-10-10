import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { Me } from '../api/dto';

/*
 * §7.4 and the two admin routes the session tests need, as MSW handlers. For
 * Vitest only: nothing here is imported by the app, and there is no mock mode.
 *
 * The cookies the browser would hold are modelled as two facts — whether the
 * access JWT still verifies, and what a refresh would answer.
 */

type RefreshOutcome = 'rotates' | 401 | 429 | 503 | 'offline';

interface Session {
  access: boolean;
  refresh: RefreshOutcome;
}

/** alice's access JWT has expired and her session is good; dave is suspended,
 *  so his sessions are revoked and his refresh answers 401. */
export const TENANTS = {
  alice: { access: false, refresh: 'rotates' },
  dave: { access: false, refresh: 401 },
} as const satisfies Record<string, Session>;

export const ME: Me = {
  provider: 'google',
  email: 'alice@example.com',
  displayName: 'Alice',
  portfolio: { slug: 'alice', status: 'unpublished' },
};

export const REFRESH = '/api/auth/refresh';

const session: Session = { ...TENANTS.alice };

/** Every request served, as `METHOD /path`, with its JSON body if it had one. */
export const calls: { request: string; body: unknown }[] = [];

export function browserHolds(next: Session): void {
  Object.assign(session, next);
  calls.length = 0;
}

export const count = (request: string) =>
  calls.filter((call) => call.request === request).length;

async function record(request: Request): Promise<unknown> {
  const text = await request.text();
  const body: unknown = text === '' ? undefined : JSON.parse(text);
  calls.push({
    request: `${request.method} ${new URL(request.url).pathname}`,
    body,
  });
  return body;
}

/** What `gateway` does first on `/api/admin/*`: no valid access JWT, no call. */
const admin =
  (answer: () => Response) =>
  async ({ request }: { request: Request }) => {
    await record(request);
    return session.access
      ? answer()
      : new HttpResponse(null, { status: 401 });
  };

export const server = setupServer(
  http.get(
    '/api/admin/me',
    admin(() => HttpResponse.json(ME)),
  ),
  http.get(
    '/api/admin/portfolio',
    admin(() => HttpResponse.json({})),
  ),
  http.patch(
    '/api/admin/portfolio/sections/:type',
    admin(() => HttpResponse.json({})),
  ),

  http.post(REFRESH, async ({ request }) => {
    await record(request);
    if (session.refresh === 'offline') return HttpResponse.error();
    if (session.refresh !== 'rotates') {
      return new HttpResponse(null, { status: session.refresh });
    }
    session.access = true;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    await record(request);
    session.access = false;
    session.refresh = 401;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/auth/logout-all', async ({ request }) => {
    await record(request);
    if (!session.access) return new HttpResponse(null, { status: 401 });
    session.access = false;
    session.refresh = 401;
    return new HttpResponse(null, { status: 204 });
  }),
);
