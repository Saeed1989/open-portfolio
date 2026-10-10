import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UserIdGuard } from '../src/admin/guards/user-id.guard';
import { AccessTokenService } from '../src/auth/access-token.service';
import { userId } from '../src/seed/ids';
import { loadGatewayKeys } from '../src/transport/gateway-key.config';
import { createApp, gatewayKeys } from './helpers';

/*
 * The API key (FR-EDGE-5, FR-EDGE-8, NFR-SEC-8): `api` at its own address,
 * with no stand-in for `gateway` in front. /auth/* and /admin/* answer 401
 * without a key this process accepts; /public/* asks for none.
 */

const alice = userId('alice').toHexString();
const key = () => randomBytes(32).toString('base64url');

const GUARDED = [
  ['GET', '/auth/resolve'],
  ['GET', '/auth/google/start'],
  ['POST', '/auth/refresh'],
  ['GET', '/admin/me'],
] as const;

describe('api at its own address', () => {
  let app: INestApplication;
  let cookie: string;
  let guard: jest.SpyInstance;

  beforeAll(async () => {
    app = await createApp({ behindGateway: false });
    cookie = `of_at=${await app.get(AccessTokenService).sign(alice)}`;
    guard = jest.spyOn(UserIdGuard.prototype, 'canActivate');
  });

  afterAll(async () => {
    guard.mockRestore();
    await app.close();
  });

  beforeEach(() => guard.mockClear());

  const send = (method: string, path: string, apiKey?: string) => {
    const agent = request(app.getHttpServer());
    const req = (method === 'POST' ? agent.post(path) : agent.get(path))
      .set('X-User-Id', alice)
      .set('Cookie', cookie);
    return apiKey === undefined ? req : req.set('X-Api-Key', apiKey);
  };

  describe.each(GUARDED)('%s %s', (method, path) => {
    it.each([
      ['no key', undefined],
      ['an empty key', ''],
      ['a key this process does not accept', key()],
      ['an accepted key with a suffix', `${gatewayKeys()[0]}x`],
      ['both accepted keys in one header', gatewayKeys().join(', ')],
    ])('%s → 401 with no body', async (_label, apiKey) => {
      const res = await send(method, path, apiKey);
      expect(res.status).toBe(401);
      expect(res.text).toBe('');
      expect(res.headers['x-user-id']).toBeUndefined();
      expect(res.headers['set-cookie']).toBeUndefined();
      expect(guard).not.toHaveBeenCalled();
    });

    it('either accepted key → the request reaches the surface', async () => {
      for (const apiKey of gatewayKeys()) {
        /* /auth/refresh still answers 401 — there is no refresh cookie — but
           from its handler, which is what clears the cookies. */
        const res = await send(method, path, apiKey);
        if (path === '/auth/refresh') {
          expect(res.headers['set-cookie']).toBeDefined();
        } else {
          expect(res.status).toBeLessThan(400);
        }
      }
    });
  });

  it.each([
    '/admin',
    '/ADMIN/me',
    '/admin/me/',
    '/admin/portfolio',
    '/admin/no-such-route',
    '/auth',
    '/AUTH/resolve',
    '/auth/no-such-route',
  ])('%s without a key → 401', async (path) => {
    expect((await send('GET', path)).status).toBe(401);
    expect(guard).not.toHaveBeenCalled();
  });

  it('a forged X-User-Id with no key → 401, and the admin guard never runs', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/me')
      .set('X-User-Id', alice);
    expect(res.status).toBe(401);
    expect(res.text).toBe('');
    expect(guard).not.toHaveBeenCalled();
  });

  it('with the key, X-User-Id still decides: absent → 401 from the guard', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/me')
      .set('X-Api-Key', gatewayKeys()[0]);
    expect(res.status).toBe(401);
    expect(guard).toHaveBeenCalledTimes(1);
  });

  it('/public/* asks for no key, and a wrong one changes nothing', async () => {
    const agent = request(app.getHttpServer());
    const without = await agent.get('/public/portfolios/alice');
    const wrong = await agent
      .get('/public/portfolios/alice')
      .set('X-Api-Key', key());
    expect(without.status).toBe(200);
    expect(wrong.status).toBe(200);
    expect(wrong.body).toEqual(without.body);
  });
});

describe('rotation (FR-EDGE-8)', () => {
  const OLD = key();
  const NEW = key();

  const status = async (accepts: string[], sent: string) => {
    const app = await createApp({ behindGateway: false, accepts });
    try {
      const res = await request(app.getHttpServer())
        .get('/admin/me')
        .set('X-User-Id', alice)
        .set('X-Api-Key', sent);
      return res.status;
    } finally {
      await app.close();
    }
  };

  it('api accepts [old, new], gateway still sends old → passes', async () => {
    expect(await status([OLD, NEW], OLD)).toBe(200);
  });

  it('api accepts [old, new], gateway sends new → passes', async () => {
    expect(await status([OLD, NEW], NEW)).toBe(200);
  });

  it('api accepts [new] only, a gateway still sending old → 401', async () => {
    expect(await status([NEW], OLD)).toBe(401);
  });
});

describe('GATEWAY_API_KEYS (FR-EDGE-8): boot is refused when', () => {
  const JWT_KEY = key();
  const env =
    (value: string | undefined) =>
    (name: string): string | undefined =>
      ({
        GATEWAY_API_KEYS: value,
        AUTH_JWT_KEYS: JSON.stringify({ current: JWT_KEY }),
      })[name];

  it.each([
    ['it is missing', undefined],
    ['it is empty', ''],
    ['it is not JSON', key()],
    ['it is not an array', JSON.stringify({ current: key() })],
    ['the list is empty', '[]'],
    ['the list holds three keys', JSON.stringify([key(), key(), key()])],
    ['an entry is not a string', JSON.stringify([key(), 42])],
    [
      'a key is shorter than 256 bits',
      JSON.stringify([randomBytes(31).toString('base64url')]),
    ],
    ['a key is not base64url', JSON.stringify([`${key()}+/=`])],
    ['a key is also a JWT key', JSON.stringify([key(), JWT_KEY])],
  ])('%s', (_label, value) => {
    expect(() => loadGatewayKeys(env(value))).toThrow(/GATEWAY_API_KEYS/);
  });

  it('never names a value in the message', () => {
    expect(() => loadGatewayKeys(env(JSON.stringify([JWT_KEY])))).toThrow(
      expect.not.objectContaining({
        message: expect.stringContaining(JWT_KEY),
      }),
    );
  });

  it('and accepts one key or two', () => {
    expect(loadGatewayKeys(env(JSON.stringify([key()])))).toHaveLength(1);
    expect(loadGatewayKeys(env(JSON.stringify([key(), key()])))).toHaveLength(
      2,
    );
  });
});
