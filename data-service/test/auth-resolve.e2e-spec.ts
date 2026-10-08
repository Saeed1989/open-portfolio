import type { INestApplication } from '@nestjs/common';
import { SignJWT } from 'jose';
import mongoose from 'mongoose';
import request from 'supertest';
import { AccessTokenService } from '../src/auth/access-token.service';
import { userId } from '../src/seed/ids';
import { createApp } from './helpers';

/*
 * GET /auth/resolve (FR-AUTH-11, §7.3): 204 with X-User-Id or 401, no body
 * either way, and no database read on any path.
 */

let app: INestApplication;
let tokens: AccessTokenService;
const alice = userId('alice').toHexString();

/* Every operation Mongoose sends, on any connection of this process. */
const operations: string[] = [];

beforeAll(async () => {
  app = await createApp();
  tokens = app.get(AccessTokenService);
  mongoose.set('debug', (collection: string, method: string) => {
    operations.push(`${collection}.${method}`);
  });
});

afterAll(async () => {
  mongoose.set('debug', false);
  await app.close();
});

const resolve = (cookie?: string) => {
  const req = request(app.getHttpServer()).get('/auth/resolve');
  return cookie === undefined ? req : req.set('Cookie', cookie);
};

it('the operation recorder sees a real read', async () => {
  operations.length = 0;
  await request(app.getHttpServer()).get('/admin/me').set('X-User-Id', alice);
  expect(operations.length).toBeGreaterThan(0);
});

describe('GET /auth/resolve', () => {
  beforeEach(() => {
    operations.length = 0;
  });
  afterEach(() => {
    expect(operations).toEqual([]);
  });

  it('answers 204 with X-User-Id for a valid access cookie', async () => {
    const res = await resolve(`of_at=${await tokens.sign(alice)}`);
    expect(res.status).toBe(204);
    expect(res.headers['x-user-id']).toBe(alice);
    expect(res.text).toBe('');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('reads the access cookie among others', async () => {
    const res = await resolve(
      `theme=dark; of_at=${await tokens.sign(alice)}; of_rt=ignored`,
    );
    expect(res.status).toBe(204);
    expect(res.headers['x-user-id']).toBe(alice);
  });

  it('answers 401 with no body when the cookie is absent', async () => {
    const res = await resolve();
    expect(res.status).toBe(401);
    expect(res.text).toBe('');
    expect(res.headers['x-user-id']).toBeUndefined();
  });

  it('answers 401 for a malformed token', async () => {
    const res = await resolve('of_at=not-a-jwt');
    expect(res.status).toBe(401);
    expect(res.text).toBe('');
  });

  it('answers 401 for a token signed with an unknown key', async () => {
    const forged = await new SignJWT()
      .setProtectedHeader({ alg: 'HS256', kid: 'current' })
      .setSubject(alice)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(Buffer.alloc(32, 7));
    expect((await resolve(`of_at=${forged}`)).status).toBe(401);
  });

  it('does not accept the token from a header or the refresh cookie', async () => {
    const token = await tokens.sign(alice);
    const viaHeader = await request(app.getHttpServer())
      .get('/auth/resolve')
      .set('Authorization', `Bearer ${token}`)
      .set('X-User-Id', alice);
    expect(viaHeader.status).toBe(401);
    expect(viaHeader.headers['x-user-id']).toBeUndefined();
    expect((await resolve(`of_rt=${token}`)).status).toBe(401);
  });
});
