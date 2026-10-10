import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import {
  createServer,
  request,
  type IncomingHttpHeaders,
  type OutgoingHttpHeaders,
} from 'node:http';
import { connect, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import type { FastifyServerOptions } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';

export const ADMIN = 'admin.openfolio.test';
export const PUBLIC_READ = 'api.openfolio.test';
export const ALICE = '5eed00000000000001010001';

export const SESSION_COOKIES = [
  'of_at=header.payload.signature; Max-Age=900; Path=/api; HttpOnly; Secure; SameSite=Lax',
  'of_rt=opaque-refresh-token; Max-Age=2592000; Path=/api/auth; HttpOnly; Secure; SameSite=Lax',
];

export interface Recorded {
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  rawHeaders: string[];
  body: string;
}

/**
 * Stands in for `api`: records every request it receives and answers the
 * few paths the suite cares about.
 */
export async function startUpstream() {
  const requests: Recorded[] = [];
  const resolve = {
    status: 204,
    headers: { 'x-user-id': ALICE } as OutgoingHttpHeaders,
    delayMs: 0,
  };

  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const url = req.url ?? '';
    requests.push({
      method: req.method ?? '',
      url,
      headers: req.headers,
      rawHeaders: req.rawHeaders,
      body,
    });

    const path = url.split('?', 1)[0];
    if (path === '/auth/resolve') {
      await sleep(resolve.delayMs);
      res.writeHead(resolve.status, resolve.headers).end();
    } else if (path === '/auth/google/callback') {
      res
        .writeHead(302, { location: '/', 'set-cookie': SESSION_COOKIES })
        .end();
    } else {
      res
        .writeHead(200, { 'content-type': 'application/json' })
        .end('{"ok":true}');
    }
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));

  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    requests,
    resolve,
    /** Recorded requests whose path starts with `prefix`. */
    calls: (prefix: string) =>
      requests.filter((recorded) => recorded.url.startsWith(prefix)),
    reset() {
      requests.length = 0;
      resolve.status = 204;
      resolve.headers = { 'x-user-id': ALICE };
      resolve.delayMs = 0;
    },
    close() {
      server.closeAllConnections();
      return new Promise((done) => server.close(done));
    },
  };
}

export type Upstream = Awaited<ReturnType<typeof startUpstream>>;

/** A stand-in for the admin build: an index and one hashed asset. */
export function makeAdminDist(): string {
  const dir = mkdtempSync(join(tmpdir(), 'edge-admin-dist-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>admin</title>');
  writeFileSync(join(dir, 'assets', 'app.js'), 'console.log("admin")');
  return dir;
}

const UNLIMITED = { max: 1_000_000, windowMs: 60_000 };

export async function startEdge(
  upstream: Upstream,
  adminDistDir: string,
  overrides: Partial<Config> = {},
  logger: FastifyServerOptions['logger'] = false,
) {
  const app = await buildApp(
    {
      adminHost: ADMIN,
      publicReadHost: PUBLIC_READ,
      apiUpstream: upstream.url,
      adminDistDir,
      port: 0,
      tls: null,
      trustedProxyCidrs: [],
      rateLimits: { oauth: UNLIMITED, auth: UNLIMITED, publicRead: UNLIMITED },
      ...overrides,
    },
    logger,
  );
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;

  return {
    close: () => app.close(),
    /**
     * One request, exactly as written: `headers` is a flat name/value list,
     * so a test controls the case of a name and may repeat it.
     */
    send(
      host: string,
      path: string,
      options: { method?: string; headers?: string[]; body?: string } = {},
    ) {
      return new Promise<{
        status: number;
        headers: IncomingHttpHeaders;
        body: string;
      }>((done, fail) => {
        const req = request(
          {
            host: '127.0.0.1',
            port,
            path,
            method: options.method ?? 'GET',
            headers: ['Host', host, ...(options.headers ?? [])],
            agent: false,
          },
          (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () =>
              done({ status: res.statusCode ?? 0, headers: res.headers, body }),
            );
          },
        );
        req.on('error', fail);
        req.end(options.body);
      });
    },
    /** Raw bytes in; every byte that came back before the socket closed. */
    raw(bytes: string) {
      return new Promise<string>((done, fail) => {
        let received = '';
        const socket = connect(port, '127.0.0.1', () => socket.write(bytes));
        socket.setTimeout(3000, () => {
          socket.destroy();
          fail(new Error('socket was left open'));
        });
        socket.on('data', (chunk) => (received += chunk));
        /* A destroyed socket may surface as a reset; 'close' still follows. */
        socket.on('error', () => {});
        socket.on('close', () => done(received));
      });
    },
  };
}

export type Edge = Awaited<ReturnType<typeof startEdge>>;
