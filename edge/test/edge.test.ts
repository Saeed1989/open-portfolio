import { rmSync } from 'node:fs';
import { Writable } from 'node:stream';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { loggerOptions } from '../src/app.js';
import {
  ADMIN,
  ALICE,
  PUBLIC_READ,
  SESSION_COOKIES,
  makeAdminDist,
  startEdge,
  startUpstream,
  type Edge,
  type Upstream,
} from './helpers.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const COOKIE = ['Cookie', 'of_at=header.payload.signature'];

let upstream: Upstream;
let adminDist: string;
let edge: Edge;

beforeAll(async () => {
  upstream = await startUpstream();
  adminDist = makeAdminDist();
  edge = await startEdge(upstream, adminDist);
});

afterAll(async () => {
  await edge.close();
  await upstream.close();
  rmSync(adminDist, { recursive: true, force: true });
});

beforeEach(() => upstream.reset());

describe('X-User-Id (FR-EDGE-4, NFR-SEC-8)', () => {
  const EVIL = '5eed00000000000001020001';

  const routes = [
    { host: ADMIN, method: 'GET', path: '/api/auth/google/start', id: '' },
    { host: ADMIN, method: 'GET', path: '/api/auth/google/callback', id: '' },
    { host: ADMIN, method: 'POST', path: '/api/auth/refresh', id: '' },
    { host: ADMIN, method: 'POST', path: '/api/auth/logout', id: '' },
    { host: ADMIN, method: 'GET', path: '/api/admin/me', id: ALICE },
    { host: ADMIN, method: 'PATCH', path: '/api/admin/portfolio/theme', id: ALICE },
    { host: PUBLIC_READ, method: 'GET', path: '/public/portfolios/alice', id: '' },
    { host: PUBLIC_READ, method: 'HEAD', path: '/public/portfolios/alice', id: '' },
  ];

  const variants: Record<string, string[]> = {
    canonical: ['X-User-Id', EVIL],
    lowercase: ['x-user-id', EVIL],
    uppercase: ['X-USER-ID', EVIL],
    'mixed case': ['x-UsEr-iD', EVIL],
    duplicated: ['X-User-Id', EVIL, 'X-User-Id', EVIL],
    'duplicated across cases': ['x-user-id', EVIL, 'X-USER-ID', EVIL],
    'hidden behind Connection': ['X-User-Id', EVIL, 'Connection', 'x-user-id'],
  };

  for (const route of routes) {
    for (const [name, headers] of Object.entries(variants)) {
      it(`${route.host} ${route.method} ${route.path} — ${name}`, async () => {
        const response = await edge.send(route.host, route.path, {
          method: route.method,
          headers: [...COOKIE, ...headers],
        });
        expect(response.status).toBeLessThan(400);

        /* Nothing the client sent reaches api, on the proxied request or on
           the identity subrequest. */
        expect(JSON.stringify(upstream.requests)).not.toContain(EVIL);

        const proxied = upstream.requests.at(-1)!;
        expect(proxied.url).toBe(route.path.replace(/^\/api/, ''));
        const sent = proxied.rawHeaders.filter(
          (_value, index, raw) =>
            index % 2 === 1 && raw[index - 1]!.toLowerCase() === 'x-user-id',
        );
        expect(sent).toEqual([route.id]);
      });
    }
  }
});

describe('Host matching (FR-EDGE-1)', () => {
  it.each([
    ['an unknown host', 'GET / HTTP/1.1\r\nHost: evil.example\r\n\r\n'],
    ['the apex', 'GET / HTTP/1.1\r\nHost: openfolio.test\r\n\r\n'],
    ['a tenant subdomain', 'GET / HTTP/1.1\r\nHost: alice.openfolio.test\r\n\r\n'],
    ['a suffix match', `GET / HTTP/1.1\r\nHost: ${ADMIN}.evil.example\r\n\r\n`],
    ['a proxied path', 'GET /api/admin/me HTTP/1.1\r\nHost: evil.example\r\n\r\n'],
    ['a malformed URL', 'GET /%zz HTTP/1.1\r\nHost: evil.example\r\n\r\n'],
    ['no Host at all', 'GET / HTTP/1.0\r\n\r\n'],
    ['bytes that are not HTTP', 'not http\r\n\r\n'],
  ])('%s: the socket is closed with no bytes written', async (_name, bytes) => {
    expect(await edge.raw(bytes)).toBe('');
    expect(upstream.requests).toHaveLength(0);
  });

  it('matches case-insensitively and ignores the port', async () => {
    const admin = await edge.send('ADMIN.Openfolio.TEST:8443', '/api/admin/me', {
      headers: COOKIE,
    });
    expect(admin.status).toBe(200);

    const read = await edge.send('Api.Openfolio.Test:443', '/public/portfolios/a');
    expect(read.status).toBe(200);
  });
});

describe('identity subrequest (FR-EDGE-3)', () => {
  it('no cookie → resolve 401 → 401 with no body, admin never called', async () => {
    upstream.resolve.status = 401;
    upstream.resolve.headers = {};

    const response = await edge.send(ADMIN, '/api/admin/me');

    expect(response.status).toBe(401);
    expect(response.body).toBe('');
    expect(upstream.calls('/auth/resolve')).toHaveLength(1);
    expect(upstream.calls('/auth/resolve')[0]!.headers.cookie).toBeUndefined();
    expect(upstream.calls('/admin')).toHaveLength(0);
  });

  it('resolve 403 → 403 with no body, admin never called', async () => {
    upstream.resolve.status = 403;
    upstream.resolve.headers = { 'content-type': 'text/plain' };

    const response = await edge.send(ADMIN, '/api/admin/me', { headers: COOKIE });

    expect(response.status).toBe(403);
    expect(response.body).toBe('');
    expect(upstream.calls('/admin')).toHaveLength(0);
  });

  it.each([
    ['204 without X-User-Id', 204, {}],
    ['204 with an empty X-User-Id', 204, { 'x-user-id': '' }],
    ['204 with a malformed X-User-Id', 204, { 'x-user-id': 'alice' }],
    ['200 with X-User-Id', 200, { 'x-user-id': ALICE }],
    ['500', 500, {}],
    ['302', 302, { location: '/sign-in' }],
  ])('%s → 502, admin never called', async (_name, status, headers) => {
    upstream.resolve.status = status;
    upstream.resolve.headers = headers;

    const response = await edge.send(ADMIN, '/api/admin/me', { headers: COOKIE });

    expect(response.status).toBe(502);
    expect(response.body).toBe('');
    expect(upstream.calls('/admin')).toHaveLength(0);
  });

  it('resolve timeout → 502 after 2 seconds, admin never called', async () => {
    upstream.resolve.delayMs = 3000;
    const started = Date.now();

    const response = await edge.send(ADMIN, '/api/admin/me', { headers: COOKIE });

    const elapsed = Date.now() - started;
    expect(response.status).toBe(502);
    expect(elapsed).toBeGreaterThanOrEqual(1900);
    expect(elapsed).toBeLessThan(2900);
    expect(upstream.calls('/admin')).toHaveLength(0);
  });

  it('sends resolve only the cookie and the request id, with no body', async () => {
    await edge.send(ADMIN, '/api/admin/portfolio/theme', {
      method: 'PATCH',
      headers: [
        ...COOKIE,
        'Authorization', 'Bearer nope',
        'Content-Type', 'application/json',
        'X-Custom', 'nope',
      ],
      body: '{"accent":"#123456"}',
    });

    const [resolve] = upstream.calls('/auth/resolve');
    expect(resolve!.method).toBe('GET');
    expect(resolve!.body).toBe('');
    expect(Object.keys(resolve!.headers).sort()).toEqual([
      'connection',
      'cookie',
      'host',
      'x-request-id',
    ]);
    expect(resolve!.headers.cookie).toBe(COOKIE[1]);
  });

  it('takes nothing from the resolve response except X-User-Id', async () => {
    upstream.resolve.headers = {
      'x-user-id': ALICE,
      'set-cookie': 'leak=1',
      'x-leak': 'from-resolve',
    };

    const response = await edge.send(ADMIN, '/api/admin/me', { headers: COOKIE });

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(response.headers['x-leak']).toBeUndefined();
    const [admin] = upstream.calls('/admin');
    expect(admin!.headers['x-user-id']).toBe(ALICE);
    expect(JSON.stringify(admin!.rawHeaders)).not.toContain('leak');
  });

  it('resolves on every request — nothing is cached', async () => {
    await edge.send(ADMIN, '/api/admin/me', { headers: COOKIE });
    await edge.send(ADMIN, '/api/admin/me', { headers: COOKIE });
    expect(upstream.calls('/auth/resolve')).toHaveLength(2);
  });
});

describe('routing (FR-EDGE-2)', () => {
  it.each([
    [ADMIN, 'GET', '/api/auth/resolve'],
    [ADMIN, 'POST', '/api/auth/resolve'],
    /* api matches without regard to case or a trailing slash. */
    [ADMIN, 'GET', '/api/auth/resolve/'],
    [ADMIN, 'GET', '/api/auth/RESOLVE'],
    [ADMIN, 'GET', '/api/auth/%72esolve'],
    [ADMIN, 'GET', '/api/auth/x/../resolve'],
    [ADMIN, 'GET', '/api/auth/x/%2e%2e/resolve'],
    [ADMIN, 'GET', '/api/auth/x/..\\resolve'],
    [ADMIN, 'GET', '/api/auth/../admin/me'],
    [ADMIN, 'GET', '/api/admin/../auth/resolve'],
    [ADMIN, 'GET', '/api/admin/../public/portfolios/alice'],
    [ADMIN, 'GET', '/api/public/portfolios/alice'],
    [ADMIN, 'GET', '/api/internal/revalidate'],
    [ADMIN, 'GET', '/api/'],
    [ADMIN, 'GET', '/public/portfolios/alice'],
    [ADMIN, 'HEAD', '/public/portfolios/alice'],
    [PUBLIC_READ, 'GET', '/admin/me'],
    [PUBLIC_READ, 'GET', '/admin/portfolio'],
    [PUBLIC_READ, 'GET', '/auth/resolve'],
    [PUBLIC_READ, 'GET', '/auth/google/start'],
    [PUBLIC_READ, 'POST', '/auth/refresh'],
    [PUBLIC_READ, 'GET', '/api/admin/me'],
    [PUBLIC_READ, 'GET', '/api/auth/google/start'],
    [PUBLIC_READ, 'GET', '/public/../admin/me'],
    [PUBLIC_READ, 'GET', '/public/../auth/google/start'],
    [PUBLIC_READ, 'GET', '/public/%2e%2e/auth/resolve'],
    [PUBLIC_READ, 'POST', '/public/portfolios/alice'],
    [PUBLIC_READ, 'DELETE', '/public/portfolios/alice'],
    [PUBLIC_READ, 'GET', '/'],
    [PUBLIC_READ, 'GET', '/assets/app.js'],
  ])('%s %s %s → 404, api never called', async (host, method, path) => {
    const response = await edge.send(host, path, { method, headers: COOKIE });

    expect(response.status).toBe(404);
    expect(response.body).toBe('');
    expect(upstream.requests).toHaveLength(0);
  });

  it('strips /api and keeps the query, method and body', async () => {
    const body = '{"accent":"#123456"}';
    await edge.send(ADMIN, '/api/admin/portfolio/theme?dry=1&x=%2F', {
      method: 'PATCH',
      headers: [...COOKIE, 'Content-Type', 'application/json'],
      body,
    });
    await edge.send(ADMIN, '/api/auth/refresh', { method: 'POST' });
    await edge.send(PUBLIC_READ, '/public/portfolios/alice/sitemap.xml');

    const [, admin, auth, read] = upstream.requests;
    expect(admin).toMatchObject({
      method: 'PATCH',
      url: '/admin/portfolio/theme?dry=1&x=%2F',
      body,
    });
    expect(admin!.headers['content-type']).toBe('application/json');
    expect(auth).toMatchObject({ method: 'POST', url: '/auth/refresh' });
    expect(read).toMatchObject({
      method: 'GET',
      url: '/public/portfolios/alice/sitemap.xml',
    });
  });

  it('proxies /api/auth/* without an identity subrequest', async () => {
    await edge.send(ADMIN, '/api/auth/google/start');
    expect(upstream.calls('/auth/resolve')).toHaveLength(0);
    expect(upstream.calls('/auth/google/start')).toHaveLength(1);
  });

  it('passes the api response through, Set-Cookie included', async () => {
    const response = await edge.send(ADMIN, '/api/auth/google/callback?code=c&state=s');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/');
    expect(response.headers['set-cookie']).toEqual(SESSION_COOKIES);
  });

  it('serves the admin build, with index.html for a path matching no file', async () => {
    const index = await edge.send(ADMIN, '/');
    const deepLink = await edge.send(ADMIN, '/sections/projects');
    const asset = await edge.send(ADMIN, '/assets/app.js');
    const write = await edge.send(ADMIN, '/sections/projects', { method: 'POST' });

    expect(index.status).toBe(200);
    expect(index.body).toContain('<title>admin</title>');
    expect(deepLink.status).toBe(200);
    expect(deepLink.body).toBe(index.body);
    expect(asset.body).toBe('console.log("admin")');
    expect(write.status).toBe(404);
    expect(upstream.requests).toHaveLength(0);
  });
});

describe('forwarded headers and request ids (NFR-OPS-4)', () => {
  it('originates a request id when none arrives, or one that is no UUID', async () => {
    await edge.send(ADMIN, '/api/auth/refresh', { method: 'POST' });
    await edge.send(ADMIN, '/api/auth/refresh', {
      method: 'POST',
      headers: ['X-Request-Id', 'not-a-uuid\twith junk'],
    });

    const [absent, junk] = upstream.requests;
    expect(absent!.headers['x-request-id']).toMatch(UUID);
    expect(junk!.headers['x-request-id']).toMatch(UUID);
    expect(junk!.headers['x-request-id']).not.toBe(absent!.headers['x-request-id']);
  });

  it('keeps an inbound UUID, on the subrequest and the proxied request alike', async () => {
    const id = '0b9f6f0e-3c53-4f0c-9d0b-6f1f3f8f2a11';
    await edge.send(ADMIN, '/api/admin/me', {
      headers: [...COOKIE, 'X-Request-Id', id],
    });

    const [resolve, admin] = upstream.requests;
    expect(resolve!.headers['x-request-id']).toBe(id);
    expect(admin!.headers['x-request-id']).toBe(id);
  });

  it('overwrites a client X-Forwarded-For when no proxy is trusted', async () => {
    await edge.send(PUBLIC_READ, '/public/portfolios/alice', {
      headers: ['X-Forwarded-For', '203.0.113.9', 'X-Forwarded-Proto', 'https'],
    });

    const [read] = upstream.requests;
    expect(read!.headers['x-forwarded-for']).toBe('127.0.0.1');
    expect(read!.headers['x-forwarded-proto']).toBe('http');
  });

  it('believes X-Forwarded-For from a trusted proxy only (Q24)', async () => {
    const behindProxy = await startEdge(upstream, adminDist, {
      trustedProxyCidrs: ['127.0.0.0/8'],
    });
    try {
      await behindProxy.send(PUBLIC_READ, '/public/portfolios/alice', {
        headers: ['X-Forwarded-For', '203.0.113.9', 'X-Forwarded-Proto', 'https'],
      });
    } finally {
      await behindProxy.close();
    }

    const [read] = upstream.requests;
    expect(read!.headers['x-forwarded-for']).toBe('203.0.113.9');
    expect(read!.headers['x-forwarded-proto']).toBe('https');
  });
});

describe('rate limits (FR-AUTH-16, Q23)', () => {
  let limited: Edge;

  beforeAll(async () => {
    limited = await startEdge(upstream, adminDist, {
      rateLimits: {
        oauth: { max: 2, windowMs: 60_000 },
        auth: { max: 3, windowMs: 60_000 },
        publicRead: { max: 4, windowMs: 60_000 },
      },
    });
  });

  afterAll(() => limited.close());

  const statuses = async (host: string, paths: string[], method = 'GET') => {
    const seen: number[] = [];
    for (const path of paths) {
      seen.push((await limited.send(host, path, { method })).status);
    }
    return seen;
  };

  it('limits start and callback together, more strictly, without calling api', async () => {
    expect(
      await statuses(ADMIN, [
        '/api/auth/google/start',
        '/api/auth/google/callback',
        '/api/auth/google/start',
        '/api/auth/google/callback',
        /* The spellings api would still match count against the same limit. */
        '/api/auth/Google/Start',
        '/api/auth/google/start/',
      ]),
    ).toEqual([200, 302, 429, 429, 429, 429]);
    expect(upstream.calls('/auth/google')).toHaveLength(2);
  });

  it('limits the rest of /api/auth/* separately', async () => {
    expect(
      await statuses(ADMIN, Array(5).fill('/api/auth/refresh'), 'POST'),
    ).toEqual([200, 200, 200, 429, 429]);
    expect(upstream.calls('/auth/refresh')).toHaveLength(3);
  });

  it('limits the public-read host per IP', async () => {
    expect(
      await statuses(PUBLIC_READ, Array(6).fill('/public/portfolios/alice')),
    ).toEqual([200, 200, 200, 200, 429, 429]);
    expect(upstream.calls('/public')).toHaveLength(4);
  });

  it('answers 429 with Retry-After and no body', async () => {
    const response = await limited.send(ADMIN, '/api/auth/google/start');
    expect(response.status).toBe(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
    expect(response.body).toBe('');
  });

  it('leaves /api/admin/* to the limits api applies', async () => {
    const response = await limited.send(ADMIN, '/api/admin/me', { headers: COOKIE });
    expect(response.status).toBe(200);
  });
});

describe('logging (FR-EDGE-7)', () => {
  it('writes no cookie, token or query string', async () => {
    let logged = '';
    const stream = new Writable({
      write(chunk, _encoding, done) {
        logged += chunk;
        done();
      },
    });
    const logging = await startEdge(upstream, adminDist, {}, {
      ...loggerOptions,
      level: 'trace',
      stream,
    });
    try {
      await logging.send(ADMIN, '/api/admin/me?token=query-secret', {
        headers: [
          'Cookie', 'of_at=cookie-secret',
          'Authorization', 'Bearer bearer-secret',
        ],
      });
      await logging.send(ADMIN, '/api/auth/google/callback?code=oauth-code-secret');
    } finally {
      await logging.close();
    }

    expect(logged).toContain('/api/auth/google/callback');
    expect(logged).not.toMatch(/secret|of_at|of_rt|opaque-refresh-token/);
  });
});
