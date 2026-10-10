import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import rateLimit from '@fastify/rate-limit';
import replyFrom from '@fastify/reply-from';
import fastify, {
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions,
} from 'fastify';
import { Pool } from 'undici';
import type { Config, RateLimit } from './config.js';

type GatewayHost = 'admin' | 'public-read';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The shape `api`'s admin guard accepts — the only shape `users._id` has. */
const USER_ID = /^[0-9a-f]{24}$/i;

const RESOLVE_TIMEOUT_MS = 2000;

/** The two paths FR-AUTH-16 limits more strictly than the rest of auth. */
const OAUTH_STEPS = new Set(['/auth/google/start', '/auth/google/callback']);

/**
 * `api` matches a path without regard to case or a trailing slash. A decision
 * taken on a path here — which one is `/auth/resolve`, which ones are the
 * OAuth steps — is taken on this spelling of it, percent-escapes undone as
 * well, so that no spelling is judged differently here than there.
 */
function plainSpelling(path: string): string | null {
  try {
    return decodeURIComponent(path).toLowerCase().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

/**
 * FR-EDGE-7. The request serializer emits no header at all and no query
 * string — the OAuth callback carries its code there — so the redaction
 * paths are the second line, for anything that logs a header object whole.
 */
export const loggerOptions = {
  redact: [
    'req.headers.cookie',
    'req.headers.authorization',
    'req.headers["set-cookie"]',
    'req.headers["x-api-key"]',
    'res.headers["set-cookie"]',
    'res.headers["x-api-key"]',
    'headers.cookie',
    'headers.authorization',
    'headers["set-cookie"]',
    'headers["x-api-key"]',
  ],
  serializers: {
    req: (req: FastifyRequest) => ({
      method: req.method,
      path: req.url.split('?', 1)[0],
      host: req.headers.host ?? '',
      remoteAddress: req.ip,
    }),
  },
} satisfies FastifyServerOptions['logger'];

/**
 * The whole of `gateway`: host matching, path routing, the identity subrequest,
 * header overwrite, API key attachment, rate limiting and request ids (SRS
 * §2.1, FR-EDGE-1..8, 10). It serves no page: the admin build belongs to the
 * admin host, which forwards `/api/*` here (FR-EDGE-9).
 * The rules below are the same in every environment (FR-EDGE-6); everything
 * that differs arrives in `config`.
 */
export async function buildApp(
  config: Config,
  logger: FastifyServerOptions['logger'] = loggerOptions,
) {
  /* FR-EDGE-1: case-insensitive, port stripped, matched exactly. */
  const hostOf = (req: IncomingMessage): GatewayHost | undefined => {
    const host = req.headers.host?.toLowerCase().replace(/:\d*$/, '');
    if (host === config.adminRouteHost) return 'admin';
    if (host === config.publicReadHost) return 'public-read';
    return undefined;
  };

  const app = fastify({
    logger,
    https: config.tls,
    /* FR-EDGE-10: the client address is the rightmost X-Forwarded-For entry
       that is not a trusted proxy, and only when the peer is one; otherwise
       it is the peer. Rate limits and logs both read it as `req.ip`. */
    trustProxy:
      config.trustedProxyCidrs.length > 0 ? config.trustedProxyCidrs : false,
    /* NFR-OPS-4: an inbound id is kept only if it is a UUID. */
    requestIdHeader: false,
    genReqId: (req) => {
      const inbound = req.headers['x-request-id'];
      return typeof inbound === 'string' && UUID.test(inbound)
        ? inbound
        : randomUUID();
    },
    /* Every route below names the host it belongs to, so a path declared
       for one host does not exist on the other (FR-EDGE-2). */
    routerOptions: {
      constraints: {
        gatewayHost: {
          name: 'gatewayHost',
          storage() {
            const handlers = new Map<GatewayHost, unknown>();
            return {
              get: (host: GatewayHost) => (handlers.get(host) as never) ?? null,
              set: (host: GatewayHost, handler: unknown) => {
                handlers.set(host, handler);
              },
            };
          },
          deriveConstraint: (req: IncomingMessage) => hostOf(req) ?? '',
          validate(host: unknown) {
            if (host !== 'admin' && host !== 'public-read') {
              throw new Error(`Unknown gateway host: ${String(host)}`);
            }
          },
        },
      },
    },
    /* Requests that never reach a route are answered by the framework, not
       by the hook below: bytes that do not parse as HTTP, and a malformed
       URL. Neither may get a response on an unmatched Host either. */
    clientErrorHandler: (_error, socket) => socket.destroy(),
    frameworkErrors: (_error, req: FastifyRequest, reply: FastifyReply) => {
      if (hostOf(req.raw) === undefined) return drop(req, reply);
      return reply.code(400).send();
    },
  });

  /* FR-EDGE-1: an unmatched Host gets no response, only a closed socket. */
  const drop = (req: FastifyRequest, reply: FastifyReply) => {
    reply.hijack();
    req.raw.socket.destroy();
  };

  app.addHook('onRequest', (req, reply, done) => {
    if (hostOf(req.raw) === undefined) return drop(req, reply);
    done();
  });

  /* Bodies are streamed to `api` as they arrive, never parsed here. */
  app.removeAllContentTypeParsers();
  app.addContentTypeParser('*', (_req, payload, done) => done(null, payload));

  /* One keepalive pool carries both the identity subrequest and the proxied
     request (§2.6, per-request cost). */
  const api = new Pool(config.apiUpstream);
  app.addHook('onClose', () => api.close());

  await app.register(replyFrom, { base: config.apiUpstream, undici: api });
  await app.register(rateLimit, { global: false });

  /* Per IP, counted in this process (FR-AUTH-16, Q23). */
  const limiter = ({ max, windowMs }: RateLimit) =>
    app.createRateLimit({ max, timeWindow: windowMs });
  const limits = {
    oauth: limiter(config.rateLimits.oauth),
    auth: limiter(config.rateLimits.auth),
    publicRead: limiter(config.rateLimits.publicRead),
  };

  /** Answers `429` and returns true once the caller is over the limit. */
  const overLimit = async (
    limit: (typeof limits)[keyof typeof limits],
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<boolean> => {
    const result = await limit(req);
    if (result.isAllowed || !result.isExceeded) return false;
    reply.code(429).header('retry-after', result.ttlInSeconds).send();
    return true;
  };

  /**
   * The path `api` will be asked for, or null when there is none to ask for.
   * The router matches a decoded path and `api` receives a normalised one, so
   * `/public/../auth/refresh` or `/api/auth/x/..\resolve` would otherwise be
   * matched under one prefix and served under another. The path is therefore
   * normalised here, by the same parser the proxy uses, and must still sit
   * under the prefix it is being sent to.
   */
  const upstreamPath = (
    req: FastifyRequest,
    from: string,
    to: string,
  ): string | null => {
    const url = req.raw.url ?? '';
    if (!url.startsWith(from)) return null;
    const { pathname } = new URL(to + url.slice(from.length), 'http://api');
    return pathname.startsWith(to) ? pathname : null;
  };

  /* FR-EDGE-4, NFR-SEC-8: X-User-Id is set on every proxied request, to the
     resolved id or to the empty value, and X-Api-Key to the key, so no
     client-supplied value of either survives. */
  const proxy = (
    req: FastifyRequest,
    reply: FastifyReply,
    path: string,
    userId: string,
  ) =>
    reply.from(path, {
      rewriteRequestHeaders: (_req, headers) => {
        delete headers['x-user-id'];
        headers['x-user-id'] = userId;
        delete headers['x-api-key'];
        headers['x-api-key'] = config.apiKey;
        headers['x-forwarded-for'] = req.ip;
        headers['x-forwarded-proto'] = req.protocol;
        headers['x-request-id'] = req.id;
        return headers;
      },
      /* The plugin would otherwise retry a GET that `api` answered 503. */
      retryDelay: () => null,
    });

  /**
   * FR-EDGE-3. Sends only the inbound Cookie, the request id and the API
   * key, and takes only X-User-Id back; nothing is cached, so this runs on every admin
   * request. The cookie is forwarded as an opaque string (FR-EDGE-7).
   */
  const resolveIdentity = async (
    req: FastifyRequest,
  ): Promise<{ userId: string } | { status: 401 | 403 | 502 }> => {
    const headers: Record<string, string> = {
      'x-request-id': req.id,
      'x-api-key': config.apiKey,
    };
    if (req.headers.cookie !== undefined) headers.cookie = req.headers.cookie;

    try {
      const response = await api.request({
        method: 'GET',
        path: '/auth/resolve',
        headers,
        signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
      });
      await response.body.dump();

      const { statusCode } = response;
      if (statusCode === 401 || statusCode === 403) {
        return { status: statusCode };
      }
      const userId = response.headers['x-user-id'];
      if (
        statusCode === 204 &&
        typeof userId === 'string' &&
        USER_ID.test(userId)
      ) {
        return { userId };
      }
      req.log.warn({ statusCode }, 'identity subrequest: unusable answer');
    } catch (err) {
      req.log.warn({ err }, 'identity subrequest failed');
    }
    return { status: 502 };
  };

  const notFound = (_req: FastifyRequest, reply: FastifyReply) =>
    reply.code(404).send();

  // -------------------------------------------------------------------------
  // Admin route (FR-EDGE-2)
  // -------------------------------------------------------------------------
  const admin = { constraints: { gatewayHost: 'admin' satisfies GatewayHost } };

  app.all('/api/auth/*', admin, async (req, reply) => {
    const path = upstreamPath(req, '/api/auth/', '/auth/');
    const route = path === null ? null : plainSpelling(path);
    if (path === null || route === null || route === '/auth/resolve') {
      return notFound(req, reply);
    }

    const limit = OAUTH_STEPS.has(route) ? limits.oauth : limits.auth;
    if (await overLimit(limit, req, reply)) return reply;

    return proxy(req, reply, path, '');
  });

  app.all('/api/admin/*', admin, async (req, reply) => {
    const path = upstreamPath(req, '/api/admin/', '/admin/');
    if (path === null) return notFound(req, reply);

    const identity = await resolveIdentity(req);
    if ('status' in identity) return reply.code(identity.status).send();

    return proxy(req, reply, path, identity.userId);
  });

  // -------------------------------------------------------------------------
  // Public-read host (FR-EDGE-2)
  // -------------------------------------------------------------------------
  app.route({
    method: ['GET', 'HEAD'],
    url: '/public/*',
    constraints: { gatewayHost: 'public-read' satisfies GatewayHost },
    handler: async (req, reply) => {
      const path = upstreamPath(req, '/public/', '/public/');
      if (path === null) return notFound(req, reply);
      if (await overLimit(limits.publicRead, req, reply)) return reply;
      return proxy(req, reply, path, '');
    },
  });

  /* Every other path, on either host, is a 404 (FR-EDGE-2). */
  app.setNotFoundHandler(notFound);

  return app;
}
