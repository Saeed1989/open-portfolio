import type { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import request from 'supertest';
import { AccessTokenService } from '../src/auth/access-token.service';
import { ACCOUNT_ACCESS, type AccountAccess } from '../src/auth/account-access';
import { Session } from '../src/auth/schemas/session.schema';
import {
  ABSOLUTE_MS,
  hashToken,
  IDLE_MS,
  SessionService,
} from '../src/auth/session.service';
import {
  createApp,
  expectHostOnlyHardened,
  expectSessionCookiesCleared,
  freshUserId,
  maxAge,
  setCookies,
} from './helpers';

/*
 * Refresh rotation and reuse detection (FR-AUTH-18), the cookies of
 * FR-AUTH-3, and the two sign-out routes (FR-AUTH-14).
 */

let app: INestApplication;
let sessions: SessionService;
let tokens: AccessTokenService;
let model: Model<Session>;

beforeAll(async () => {
  app = await createApp();
  sessions = app.get(SessionService);
  tokens = app.get(AccessTokenService);
  model = app.get(getModelToken(Session.name));
});

afterAll(async () => {
  await app.close();
});

const post = (path: string, cookie?: string) => {
  const req = request(app.getHttpServer()).post(path);
  return cookie === undefined ? req : req.set('Cookie', cookie);
};
const refresh = (token: string) => post('/auth/refresh', `of_rt=${token}`);

const stored = (token: string) =>
  model.findOne({ tokenHash: hashToken(token) }).lean();
const byPrevious = (token: string) =>
  model.findOne({ previousTokenHash: hashToken(token) }).lean();

const SECOND = 1000;

describe('a new session (§5.8)', () => {
  it('stores the hash only, with a 30-day idle and a 90-day absolute window', async () => {
    const before = Date.now();
    const { refreshToken } = await sessions.create(freshUserId());

    /* 256 bits, base64url. */
    expect(Buffer.from(refreshToken, 'base64url')).toHaveLength(32);

    const row = (await stored(refreshToken))!;
    expect(Object.keys(row).sort()).toEqual(
      [
        '__v',
        '_id',
        'absoluteExpiresAt',
        'createdAt',
        'idleExpiresAt',
        'previousTokenHash',
        'revokedAt',
        'tokenHash',
        'userId',
      ].sort(),
    );
    expect(JSON.stringify(row)).not.toContain(refreshToken);
    expect(row.previousTokenHash).toBeNull();
    expect(row.revokedAt).toBeNull();
    expect(row.idleExpiresAt.getTime() - before).toBeGreaterThanOrEqual(
      IDLE_MS,
    );
    expect(row.idleExpiresAt.getTime() - before).toBeLessThan(
      IDLE_MS + 5 * SECOND,
    );
    expect(row.absoluteExpiresAt.getTime() - before).toBeGreaterThanOrEqual(
      ABSOLUTE_MS,
    );
  });

  it('has the indexes of §5.8', async () => {
    const indexes = await model.collection.indexes();
    const find = (key: string) => indexes.find((index) => key in index.key);
    expect(find('tokenHash')?.unique).toBe(true);
    expect(find('previousTokenHash')).toBeDefined();
    expect(find('userId')).toBeDefined();
  });
});

describe('POST /auth/refresh', () => {
  it('rotates the token and sets both cookies', async () => {
    const user = freshUserId();
    const { refreshToken: first } = await sessions.create(user);
    const original = (await stored(first))!;
    /* An idle window that has visibly run down, so the reset is observable. */
    await model.updateOne(
      { _id: original._id },
      { $set: { idleExpiresAt: new Date(Date.now() + 60 * SECOND) } },
    );

    const res = await refresh(first);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');

    const { of_at: access, of_rt: rotated } = setCookies(res);
    expectHostOnlyHardened(access);
    expect(access.attributes).toEqual(
      expect.arrayContaining(['path=/api', 'max-age=900']),
    );
    expect(await tokens.verify(access.value)).toBe(user);

    expectHostOnlyHardened(rotated);
    expect(rotated.attributes).toContain('path=/api/auth');
    expect(rotated.value).not.toBe(first);

    const row = (await stored(rotated.value))!;
    expect(row._id).toEqual(original._id);
    expect(row.previousTokenHash).toBe(hashToken(first));
    expect(row.absoluteExpiresAt).toEqual(original.absoluteExpiresAt);
    expect(row.revokedAt).toBeNull();

    /* Idle window reset to 30 days, and the cookie lives exactly that long. */
    const remaining = (row.idleExpiresAt.getTime() - Date.now()) / SECOND;
    expect(remaining).toBeGreaterThan(IDLE_MS / SECOND - 10);
    expect(maxAge(rotated)).toBeGreaterThan(IDLE_MS / SECOND - 10);
    expect(maxAge(rotated)).toBeLessThanOrEqual(IDLE_MS / SECOND);

    /* The rotated token is the session's token now. */
    expect((await refresh(rotated.value)).status).toBe(204);
  });

  it('caps the idle window, and the cookie, at absoluteExpiresAt', async () => {
    const { refreshToken } = await sessions.create(freshUserId());
    const absoluteExpiresAt = new Date(Date.now() + 3600 * SECOND);
    await model.updateOne(
      { tokenHash: hashToken(refreshToken) },
      { $set: { absoluteExpiresAt } },
    );

    const res = await refresh(refreshToken);
    expect(res.status).toBe(204);

    const rotated = setCookies(res).of_rt;
    const row = (await stored(rotated.value))!;
    expect(row.idleExpiresAt).toEqual(absoluteExpiresAt);
    expect(row.absoluteExpiresAt).toEqual(absoluteExpiresAt);
    expect(maxAge(rotated)).toBeLessThanOrEqual(3600);
    expect(maxAge(rotated)).toBeGreaterThan(3590);
  });

  it('reuse of the previous token revokes the session', async () => {
    const { refreshToken: first } = await sessions.create(freshUserId());
    const second = setCookies(await refresh(first)).of_rt.value;

    const reuse = await refresh(first);
    expect(reuse.status).toBe(401);
    expect(reuse.text).toBe('');
    expectSessionCookiesCleared(reuse);
    expect((await stored(second))!.revokedAt).toBeInstanceOf(Date);

    /* The legitimate holder of the current token is signed out too. */
    const after = await refresh(second);
    expect(after.status).toBe(401);
    expectSessionCookiesCleared(after);
  });

  it('only the immediately previous token is reuse: an older one is unknown', async () => {
    const { refreshToken: first } = await sessions.create(freshUserId());
    const second = setCookies(await refresh(first)).of_rt.value;
    const third = setCookies(await refresh(second)).of_rt.value;

    const res = await refresh(first);
    expect(res.status).toBe(401);
    expectSessionCookiesCleared(res);
    expect((await stored(third))!.revokedAt).toBeNull();
    expect((await refresh(third)).status).toBe(204);
  });

  it('concurrent refreshes with one token: one wins, and reuse revokes (open question 17)', async () => {
    const { refreshToken } = await sessions.create(freshUserId());
    const results = await Promise.all([
      refresh(refreshToken),
      refresh(refreshToken),
    ]);
    expect(results.map((res) => res.status).sort()).toEqual([204, 401]);
    expect((await byPrevious(refreshToken))!.revokedAt).toBeInstanceOf(Date);
  });

  it.each([
    ['revoked', { revokedAt: new Date() }],
    ['idle-expired', { idleExpiresAt: new Date(Date.now() - SECOND) }],
    [
      'absolute-expired',
      {
        /* Idle still open, so only the absolute window decides. */
        idleExpiresAt: new Date(Date.now() + 3600 * SECOND),
        absoluteExpiresAt: new Date(Date.now() - SECOND),
      },
    ],
  ])('a %s session → 401 and cleared cookies', async (_label, state) => {
    const { refreshToken } = await sessions.create(freshUserId());
    await model.updateOne(
      { tokenHash: hashToken(refreshToken) },
      { $set: state },
    );

    const res = await refresh(refreshToken);
    expect(res.status).toBe(401);
    expect(res.text).toBe('');
    expectSessionCookiesCleared(res);

    /* Nothing was rotated. */
    const row = (await stored(refreshToken))!;
    expect(row.previousTokenHash).toBeNull();
  });

  it('an unknown token or no cookie → 401 and cleared cookies', async () => {
    for (const res of [
      await refresh('never-issued'),
      await post('/auth/refresh'),
      await post('/auth/refresh', 'of_rt='),
    ]) {
      expect(res.status).toBe(401);
      expectSessionCookiesCleared(res);
    }
  });

  it('does not take the token from the access cookie', async () => {
    const { refreshToken } = await sessions.create(freshUserId());
    const res = await post('/auth/refresh', `of_at=${refreshToken}`);
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('revokes the presented session only and clears both cookies', async () => {
    const user = freshUserId();
    const here = (await sessions.create(user)).refreshToken;
    const elsewhere = (await sessions.create(user)).refreshToken;

    const res = await post('/auth/logout', `of_rt=${here}`);
    expect(res.status).toBe(204);
    expectSessionCookiesCleared(res);

    expect((await stored(here))!.revokedAt).toBeInstanceOf(Date);
    expect((await stored(elsewhere))!.revokedAt).toBeNull();
    expect((await refresh(here)).status).toBe(401);
    expect((await refresh(elsewhere)).status).toBe(204);
  });

  it('answers 204 and clears both cookies when no session is found', async () => {
    for (const res of [
      await post('/auth/logout'),
      await post('/auth/logout', 'of_rt=never-issued'),
    ]) {
      expect(res.status).toBe(204);
      expectSessionCookiesCleared(res);
    }
  });
});

describe('POST /auth/logout-all', () => {
  it('revokes every session of the JWT’s user, and no one else’s', async () => {
    const user = freshUserId();
    const mine = [
      (await sessions.create(user)).refreshToken,
      (await sessions.create(user)).refreshToken,
    ];
    const theirs = (await sessions.create(freshUserId())).refreshToken;

    const res = await post(
      '/auth/logout-all',
      `of_at=${await tokens.sign(user)}`,
    );
    expect(res.status).toBe(204);
    expectSessionCookiesCleared(res);

    for (const token of mine) {
      expect((await stored(token))!.revokedAt).toBeInstanceOf(Date);
      expect((await refresh(token)).status).toBe(401);
    }
    expect((await stored(theirs))!.revokedAt).toBeNull();
  });

  it('answers 401 without an access JWT, revokes nothing, and leaves the cookies for the retry', async () => {
    const user = freshUserId();
    const { refreshToken } = await sessions.create(user);

    for (const res of [
      await post('/auth/logout-all'),
      await post('/auth/logout-all', 'of_at=not-a-jwt'),
      /* The refresh cookie alone names no user here. */
      await post('/auth/logout-all', `of_rt=${refreshToken}`),
    ]) {
      expect(res.status).toBe(401);
      expect(res.text).toBe('');
      expect(res.headers['set-cookie']).toBeUndefined();
    }
    expect((await stored(refreshToken))!.revokedAt).toBeNull();
  });
});

describe('FR-AUTH-17 revokeAllForUser', () => {
  it('revokes by user id', async () => {
    const user = freshUserId();
    const { refreshToken } = await sessions.create(user);

    await app.get<AccountAccess>(ACCOUNT_ACCESS).revokeAllForUser(user);
    expect((await stored(refreshToken))!.revokedAt).toBeInstanceOf(Date);
  });
});
