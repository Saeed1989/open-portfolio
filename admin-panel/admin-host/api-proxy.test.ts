// @vitest-environment node
import {
  createServer as createUpstream,
  request,
  type IncomingHttpHeaders,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { apiProxy } from './api-proxy';

/*
 * FR-EDGE-9, on the real dev server with the real rule, against a stub
 * standing in for `gateway`. Plain HTTP on both hops: the rule is the same,
 * and TLS is the config's business, not the rule's.
 */

const ADMIN_HOST = 'admin.openfolio.test:5174';

const SET_COOKIE = [
  'of_at=access; Max-Age=900; Path=/api; HttpOnly; Secure; SameSite=Lax',
  'of_rt=refresh; Max-Age=2592000; Path=/api/auth; HttpOnly; Secure; SameSite=Lax',
];
const GOOGLE = 'https://accounts.google.com/o/oauth2/v2/auth?state=s';

interface Seen {
  method: string | undefined;
  url: string | undefined;
  headers: IncomingHttpHeaders;
  body: string;
}

/** Every request the stub served. */
const seen: Seen[] = [];

const upstream = createUpstream((req, res) => {
  let body = '';
  req.on('data', (chunk: Buffer) => (body += chunk.toString()));
  req.on('end', () => {
    seen.push({ method: req.method, url: req.url, headers: req.headers, body });
    if (req.url?.startsWith('/api/auth/google/start')) {
      res.writeHead(302, { Location: GOOGLE }).end();
    } else if (req.url?.startsWith('/api/auth/google/callback')) {
      res.writeHead(302, { Location: '/', 'Set-Cookie': SET_COOKIE }).end();
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
    }
  });
});

let admin: ViteDevServer;
let adminPort: number;
let upstreamHost: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  upstreamHost = `127.0.0.1:${String((upstream.address() as AddressInfo).port)}`;

  admin = await createServer({
    configFile: false,
    logLevel: 'silent',
    optimizeDeps: { noDiscovery: true },
    server: {
      host: '127.0.0.1',
      port: 0,
      allowedHosts: ['admin.openfolio.test'],
      hmr: false,
      watch: null,
      proxy: apiProxy(`http://${upstreamHost}`),
    },
  });
  await admin.listen();
  adminPort = (admin.httpServer?.address() as AddressInfo).port;
});

afterAll(async () => {
  await admin.close();
  upstream.close();
});

beforeEach(() => {
  seen.length = 0;
});

/** One request to the admin host, as the browser sends it. Never follows a
 *  redirect, so what comes back is what the admin host answered. */
function browser(
  path: string,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {},
) {
  return new Promise<{
    status: number | undefined;
    headers: IncomingHttpHeaders;
    body: string;
  }>((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port: adminPort,
        path,
        method: init.method ?? 'GET',
        headers: { Host: ADMIN_HOST, ...init.headers },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => (body += chunk.toString()));
        res.on('end', () => {
          resolve({ status: res.statusCode, headers: res.headers, body });
        });
      },
    );
    req.on('error', reject);
    req.end(init.body);
  });
}

test('method, path, query, body and Cookie reach gateway unchanged', async () => {
  const cookie = 'of_at=a.b.c; other=1';
  const body = JSON.stringify({ enabled: true });

  await browser('/api/admin/portfolio/sections/hero?x=1&y=a%20b', {
    method: 'PATCH',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body,
  });

  expect(seen).toHaveLength(1);
  expect(seen[0]).toMatchObject({
    method: 'PATCH',
    url: '/api/admin/portfolio/sections/hero?x=1&y=a%20b',
    body,
  });
  expect(seen[0]?.headers.cookie).toBe(cookie);
});

test('Host is gateway, X-Forwarded-* name the admin host, and no identity is set', async () => {
  await browser('/api/admin/me');

  const headers = seen[0]?.headers ?? {};
  expect(headers.host).toBe(upstreamHost);
  expect(headers['x-forwarded-host']).toBe(ADMIN_HOST);
  expect(headers['x-forwarded-proto']).toBe('http');
  expect(headers['x-forwarded-for']).toMatch(/127\.0\.0\.1$/);
  expect(headers).not.toHaveProperty('x-user-id');
  expect(headers).not.toHaveProperty('x-api-key');
});

test('every Set-Cookie arrives unchanged, with no Domain added', async () => {
  const response = await browser('/api/auth/google/callback?code=c&state=s');

  expect(response.status).toBe(302);
  expect(response.headers.location).toBe('/');
  expect(response.headers['set-cookie']).toEqual(SET_COOKIE);
  expect(response.headers['set-cookie']?.join()).not.toMatch(/domain=/i);
});

test('a redirect is returned as sent and not followed', async () => {
  const response = await browser('/api/auth/google/start');

  expect(response.status).toBe(302);
  expect(response.headers.location).toBe(GOOGLE);
  expect(seen).toHaveLength(1);
});

test('an /api response is not cached', async () => {
  await browser('/api/admin/me');
  await browser('/api/admin/me');

  expect(seen).toHaveLength(2);
});

test('a path outside /api/ is the app, and never reaches gateway', async () => {
  const response = await browser('/sections/hero');

  expect(response.status).toBe(200);
  expect(response.body).toContain('<div id="root">');
  expect(seen).toHaveLength(0);
});
