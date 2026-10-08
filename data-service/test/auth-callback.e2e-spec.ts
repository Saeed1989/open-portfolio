import { createHash, generateKeyPairSync, type KeyObject } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { SignJWT } from 'jose';
import type { Model } from 'mongoose';
import nock from 'nock';
import request from 'supertest';
import { AccessTokenService } from '../src/auth/access-token.service';
import { Session } from '../src/auth/schemas/session.schema';
import { User } from '../src/auth/schemas/user.schema';
import { hashToken } from '../src/auth/session.service';
import { Portfolio } from '../src/schemas/portfolio.schema';
import { LAST_LOGIN_AT, userId } from '../src/seed/ids';
import {
  createApp,
  expectHostOnlyHardened,
  setCookies,
  type SetCookie,
} from './helpers';

/*
 * Google sign-in, start to callback (§2.5, FR-AUTH-8, 15, 21, 22). Google is
 * mocked at the HTTP boundary: the token endpoint and the published signing
 * keys are nock interceptors, and the ID tokens are real RS256 JWTs signed by
 * a key generated here. Nothing else leaves the process.
 */

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;
const KID = 'e2e-google-key';

const google = generateKeyPairSync('rsa', { modulusLength: 2048 });
const stranger = generateKeyPairSync('rsa', { modulusLength: 2048 });

/* Outbound requests nock saw and had no interceptor for. */
const unmatched: string[] = [];

let app: INestApplication;
let users: Model<User>;
let sessions: Model<Session>;
let portfolios: Model<Portfolio>;

beforeAll(async () => {
  nock.disableNetConnect();
  nock.enableNetConnect('127.0.0.1');
  nock.emitter.on('no match', (req: { host?: string; hostname?: string }) => {
    const host = String(req.hostname ?? req.host);
    /* supertest's own requests to this app are allowed through unmatched. */
    if (host !== '127.0.0.1') unmatched.push(host);
  });
  nock('https://www.googleapis.com')
    .persist()
    .get('/oauth2/v1/certs')
    .reply(
      200,
      { [KID]: google.publicKey.export({ type: 'spki', format: 'pem' }) },
      { 'cache-control': 'public, max-age=3600' },
    );

  app = await createApp();
  users = app.get(getModelToken(User.name));
  sessions = app.get(getModelToken(Session.name));
  portfolios = app.get(getModelToken(Portfolio.name));
});

afterAll(async () => {
  await app.close();
  nock.cleanAll();
  nock.enableNetConnect();
});

afterEach(() => {
  /* Every exchange a test arranged was made; none leaks into the next. */
  expect(nock.pendingMocks().filter((m) => m.includes('/token'))).toEqual([]);
});

interface Attempt {
  cookie: SetCookie;
  state: string;
  verifier: string;
  nonce: string;
  location: URL;
}

/** GET /auth/google/start, decoded. */
async function start(returnTo?: string): Promise<Attempt> {
  const res = await request(app.getHttpServer())
    .get('/auth/google/start')
    .query(returnTo === undefined ? {} : { returnTo });
  expect(res.status).toBe(302);
  const cookie = setCookies(res).of_oauth;
  const { state, verifier, nonce } = JSON.parse(
    Buffer.from(cookie.value, 'base64url').toString('utf8'),
  );
  return {
    cookie,
    state,
    verifier,
    nonce,
    location: new URL(res.headers.location),
  };
}

let subs = 0;
const newSub = () => `2000000000000000${String(++subs).padStart(5, '0')}`;

type Claims = Record<string, unknown>;

/** A Google ID token for this attempt; `overrides` break one rule at a time. */
function idToken(
  attempt: Attempt,
  overrides: Claims = {},
  key: KeyObject = google.privateKey,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    sub: newSub(),
    email: `user${subs}@example.dev`,
    email_verified: true,
    name: 'New User',
    picture: 'https://lh3.googleusercontent.test/a/new-user',
    nonce: attempt.nonce,
    iat: now,
    exp: now + 3600,
    ...overrides,
  })
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .sign(key);
}

/** Google's token endpoint answers the next exchange with this ID token. */
function googleAnswers(token: string): { body: () => URLSearchParams } {
  let received = '';
  nock('https://oauth2.googleapis.com')
    .post('/token', (body: unknown) => {
      received =
        typeof body === 'string'
          ? body
          : new URLSearchParams(body as Record<string, string>).toString();
      return true;
    })
    .reply(200, {
      access_token: 'google-access-token',
      refresh_token: 'google-refresh-token',
      id_token: token,
      token_type: 'Bearer',
      expires_in: 3599,
      scope: 'openid email profile',
    });
  return { body: () => new URLSearchParams(received) };
}

const callback = (
  attempt: Attempt,
  query: Record<string, string> = { code: 'auth-code', state: attempt.state },
) =>
  request(app.getHttpServer())
    .get('/auth/google/callback')
    .query(query)
    .set('Cookie', `of_oauth=${attempt.cookie.value}`);

function expectFailure(
  res: { status: number; headers: Record<string, string> },
  code: 'auth_failed' | 'account_suspended',
): void {
  expect(res.status).toBe(302);
  expect(res.headers.location).toBe(`/sign-in?error=${code}`);
  const cookies = setCookies(res);
  expect(cookies.of_oauth.value).toBe('');
  expect(cookies.of_oauth.attributes).toEqual(
    expect.arrayContaining(['path=/api/auth', 'max-age=0']),
  );
  expect(cookies.of_at).toBeUndefined();
  expect(cookies.of_rt).toBeUndefined();
}

it('the outbound recorder sees an unmatched request', async () => {
  unmatched.length = 0;
  await expect(
    fetch('https://oauth2.googleapis.com/token', { method: 'POST' }),
  ).rejects.toThrow();
  expect(unmatched).toHaveLength(1);
});

describe('GET /auth/google/start', () => {
  it('redirects to Google with code flow, PKCE S256, state and nonce', async () => {
    const { location, state, verifier, nonce } = await start();

    expect(location.origin + location.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    expect(Object.fromEntries(location.searchParams)).toEqual({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
    /* The verifier and the client secret stay server-side. */
    expect(location.href).not.toContain(verifier);
    expect(location.href).not.toContain(process.env.GOOGLE_CLIENT_SECRET);
  });

  it('sets the state cookie of FR-AUTH-8', async () => {
    const { cookie } = await start();
    expectHostOnlyHardened(cookie);
    expect(cookie.attributes).toEqual(
      expect.arrayContaining(['path=/api/auth', 'max-age=600']),
    );
  });

  it('generates fresh values per attempt', async () => {
    const [a, b] = [await start(), await start()];
    expect(a.state).not.toBe(b.state);
    expect(a.verifier).not.toBe(b.verifier);
    expect(a.nonce).not.toBe(b.nonce);
  });
});

describe('GET /auth/google/callback', () => {
  it('first sign-in creates a user and a session, and nothing else', async () => {
    const attempt = await start();
    const sub = newSub();
    const exchange = googleAnswers(
      await idToken(attempt, { sub, email: 'first@example.dev' }),
    );
    const portfoliosBefore = await portfolios.countDocuments();

    const res = await callback(attempt);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');

    /* The exchange carried the code, the verifier, the secret and the URI. */
    expect(Object.fromEntries(exchange.body())).toMatchObject({
      grant_type: 'authorization_code',
      code: 'auth-code',
      code_verifier: attempt.verifier,
      client_id: CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    });

    const cookies = setCookies(res);
    expect(cookies.of_oauth.value).toBe('');
    expect(cookies.of_oauth.attributes).toContain('max-age=0');
    expectHostOnlyHardened(cookies.of_at);
    expect(cookies.of_at.attributes).toEqual(
      expect.arrayContaining(['path=/api', 'max-age=900']),
    );
    expectHostOnlyHardened(cookies.of_rt);
    expect(cookies.of_rt.attributes).toContain('path=/api/auth');

    const user = (await users
      .findOne({ provider: 'google', providerId: sub })
      .lean())!;
    expect(user).toMatchObject({
      email: 'first@example.dev',
      displayName: 'New User',
      avatarUrl: 'https://lh3.googleusercontent.test/a/new-user',
      status: 'active',
    });
    expect(user.lastLoginAt).toBeInstanceOf(Date);
    expect(user.createdAt).toBeInstanceOf(Date);

    /* FR-AUTH-22: no Google token is stored. */
    expect(Object.keys(user).sort()).toEqual(
      [
        '__v',
        '_id',
        'avatarUrl',
        'createdAt',
        'displayName',
        'email',
        'lastLoginAt',
        'provider',
        'providerId',
        'status',
      ].sort(),
    );

    const id = user._id.toHexString();
    expect(await app.get(AccessTokenService).verify(cookies.of_at.value)).toBe(
      id,
    );
    const session = (await sessions
      .findOne({ tokenHash: hashToken(cookies.of_rt.value) })
      .lean())!;
    expect(session.userId.toHexString()).toBe(id);

    /* FR-AUTH-2: no portfolio. */
    expect(await portfolios.countDocuments()).toBe(portfoliosBefore);
    expect(await portfolios.exists({ userId: user._id })).toBeNull();
  });

  it('a later sign-in refreshes the profile on the same user', async () => {
    const sub = newSub();
    const first = await start();
    googleAnswers(await idToken(first, { sub, email: 'before@example.dev' }));
    await callback(first);
    const before = (await users.findOne({ providerId: sub }).lean())!;

    const second = await start();
    googleAnswers(
      await idToken(second, {
        sub,
        email: 'after@example.dev',
        name: 'Renamed',
        picture: 'https://lh3.googleusercontent.test/a/renamed',
      }),
    );
    expect((await callback(second)).headers.location).toBe('/');

    const after = (await users.findOne({ providerId: sub }).lean())!;
    expect(await users.countDocuments({ providerId: sub })).toBe(1);
    expect(after._id).toEqual(before._id);
    expect(after.createdAt).toEqual(before.createdAt);
    expect(after).toMatchObject({
      email: 'after@example.dev',
      displayName: 'Renamed',
      avatarUrl: 'https://lh3.googleusercontent.test/a/renamed',
    });
    expect(after.lastLoginAt.getTime()).toBeGreaterThanOrEqual(
      before.lastLoginAt.getTime(),
    );
  });

  it('accepts the bare issuer form', async () => {
    const attempt = await start();
    googleAnswers(await idToken(attempt, { iss: 'accounts.google.com' }));
    expect((await callback(attempt)).headers.location).toBe('/');
  });

  describe('returnTo (FR-AUTH-15)', () => {
    it.each(['/sections', '/onboarding/slug', '/'])(
      'lands on the allowlisted path %s',
      async (returnTo) => {
        const attempt = await start(returnTo);
        googleAnswers(await idToken(attempt));
        expect((await callback(attempt)).headers.location).toBe(returnTo);
      },
    );

    it.each([
      'https://evil.example/',
      '//evil.example/sections',
      '/\\evil.example',
      'sections',
      '/sections/../../evil',
      '/sections?next=https://evil.example',
      '/not-on-the-list',
    ])('ignores %s and lands on /', async (returnTo) => {
      const attempt = await start(returnTo);
      googleAnswers(await idToken(attempt));
      expect((await callback(attempt)).headers.location).toBe('/');
    });

    it('ignores a returnTo on the callback query, and a forged one in the cookie', async () => {
      const attempt = await start();
      googleAnswers(await idToken(attempt));
      const viaQuery = await callback(attempt, {
        code: 'auth-code',
        state: attempt.state,
        returnTo: 'https://evil.example/',
      });
      expect(viaQuery.headers.location).toBe('/');

      const forged = await start();
      googleAnswers(await idToken(forged));
      const value = Buffer.from(
        JSON.stringify({
          state: forged.state,
          verifier: forged.verifier,
          nonce: forged.nonce,
          returnTo: 'https://evil.example/',
        }),
      ).toString('base64url');
      const res = await callback({
        ...forged,
        cookie: { ...forged.cookie, value },
      });
      expect(res.headers.location).toBe('/');
    });
  });

  describe('fails with auth_failed and never reaches Google when', () => {
    /* No token interceptor is set, so an exchange attempt would be recorded
       as an unmatched outbound request. */
    beforeEach(() => {
      unmatched.length = 0;
    });
    afterEach(() => {
      expect(unmatched).toEqual([]);
    });

    it('state does not match the cookie', async () => {
      const attempt = await start();
      const other = await start();
      const res = await callback(attempt, {
        code: 'auth-code',
        state: other.state,
      });
      expectFailure(res, 'auth_failed');
    });

    it.each([
      ['state is missing', { code: 'auth-code' }],
      ['code is missing', undefined],
      ['Google reports an error', { error: 'access_denied' }],
    ])('%s', async (_label, query) => {
      const attempt = await start();
      const res = await callback(
        attempt,
        (query ?? { state: attempt.state }) as Record<string, string>,
      );
      expectFailure(res, 'auth_failed');
    });

    it('the state cookie is absent or unreadable', async () => {
      const attempt = await start();
      const absent = await request(app.getHttpServer())
        .get('/auth/google/callback')
        .query({ code: 'auth-code', state: attempt.state });
      expectFailure(absent, 'auth_failed');

      const garbled = await callback(
        { ...attempt, cookie: { ...attempt.cookie, value: 'not-base64-json' } },
        { code: 'auth-code', state: attempt.state },
      );
      expectFailure(garbled, 'auth_failed');
    });
  });

  describe('fails with auth_failed and writes nothing when the ID token', () => {
    it.each<[string, Claims]>([
      ['carries the wrong nonce', { nonce: 'someone-elses-nonce' }],
      ['carries no nonce', { nonce: undefined }],
      ['has email_verified false', { email_verified: false }],
      ['has email_verified as a string', { email_verified: 'true' }],
      ['has no email_verified', { email_verified: undefined }],
      ['names another audience', { aud: 'another-client-id' }],
      ['names another issuer', { iss: 'https://accounts.evil.example' }],
      ['has expired', { iat: 1_700_000_000, exp: 1_700_003_600 }],
    ])('%s', async (_label, overrides) => {
      const attempt = await start();
      const sub = newSub();
      googleAnswers(await idToken(attempt, { sub, ...overrides }));

      expectFailure(await callback(attempt), 'auth_failed');
      expect(await users.exists({ providerId: sub })).toBeNull();
    });

    it('is signed by a key Google does not publish', async () => {
      const attempt = await start();
      const sub = newSub();
      googleAnswers(await idToken(attempt, { sub }, stranger.privateKey));

      expectFailure(await callback(attempt), 'auth_failed');
      expect(await users.exists({ providerId: sub })).toBeNull();
    });

    it('is missing, or the exchange is refused', async () => {
      const attempt = await start();
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(400, { error: 'invalid_grant' });
      expectFailure(await callback(attempt), 'auth_failed');

      const again = await start();
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(200, { access_token: 'x', token_type: 'Bearer' });
      expectFailure(await callback(again), 'auth_failed');
    });
  });

  it('refuses a suspended user with account_suspended, and writes nothing', async () => {
    const attempt = await start();
    googleAnswers(
      await idToken(attempt, {
        sub: '100000000000000004004',
        email: 'dave@example.co',
        name: 'Changed While Suspended',
      }),
    );
    const sessionsBefore = await sessions.countDocuments({
      userId: userId('dave'),
    });

    expectFailure(await callback(attempt), 'account_suspended');

    const dave = (await users.findById(userId('dave')).lean())!;
    expect(dave.status).toBe('suspended');
    expect(dave.displayName).not.toBe('Changed While Suspended');
    expect(dave.lastLoginAt).toEqual(LAST_LOGIN_AT);
    expect(await sessions.countDocuments({ userId: userId('dave') })).toBe(
      sessionsBefore,
    );
  });

  it('refuses a new sub whose email another user holds', async () => {
    const attempt = await start();
    const sub = newSub();
    googleAnswers(await idToken(attempt, { sub, email: 'alice@example.com' }));

    expectFailure(await callback(attempt), 'auth_failed');

    expect(await users.exists({ providerId: sub })).toBeNull();
    expect(await users.countDocuments({ email: 'alice@example.com' })).toBe(1);
    const alice = (await users.findById(userId('alice')).lean())!;
    expect(alice.providerId).toBe('100000000000000001001');
  });
});
