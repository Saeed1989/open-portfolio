import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AccessTokenService } from '../src/auth/access-token.service';
import { portfolioId, userId } from '../src/seed/ids';
import { createApp, freshUserId } from './helpers';

/*
 * The admin guard (FR-AUTH-12, FR-TEN-4, FR-API-3): X-User-Id is the only
 * identity input, and it scopes every read.
 */

let app: INestApplication;
const alice = userId('alice').toHexString();
const bob = userId('bob').toHexString();

beforeAll(async () => {
  app = await createApp();
});

afterAll(async () => {
  await app.close();
});

const get = (path: string) => request(app.getHttpServer()).get(path);

describe('X-User-Id', () => {
  it('missing → 401', async () => {
    expect((await get('/admin/me')).status).toBe(401);
  });

  it.each([
    ['empty', ''],
    ['not hex', 'z'.repeat(24)],
    ['too short', alice.slice(1)],
    ['too long', `${alice}0`],
    ['a slug', 'alice'],
    ['padded', ` ${alice}x`],
    ['two ids', `${alice},${bob}`],
  ])('%s → 401', async (_label, value) => {
    expect((await get('/admin/me').set('X-User-Id', value)).status).toBe(401);
    expect((await get('/admin/portfolio').set('X-User-Id', value)).status).toBe(
      401,
    );
  });

  it('a valid access cookie is not an identity here', async () => {
    const token = await app.get(AccessTokenService).sign(alice);
    const res = await get('/admin/me')
      .set('Cookie', `of_at=${token}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('is sufficient alone: no API key takes part', async () => {
    expect((await get('/admin/me').set('X-User-Id', alice)).status).toBe(200);
  });
});

describe('scope comes from X-User-Id and nothing else', () => {
  it('each tenant reads their own portfolio', async () => {
    const asAlice = await get('/admin/portfolio').set('X-User-Id', alice);
    const asBob = await get('/admin/portfolio').set('X-User-Id', bob);
    expect(asAlice.body.slug).toBe('alice');
    expect(asBob.body.slug).toBe('bob');
  });

  it("bob's id cannot read alice's portfolio by naming her identifiers", async () => {
    const res = await get('/admin/portfolio')
      .query({
        userId: alice,
        portfolioId: portfolioId('alice').toHexString(),
        slug: 'alice',
      })
      .set('X-User-Id', bob);
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('bob');
    expect(JSON.stringify(res.body)).not.toContain('alice');

    const sections = await get('/admin/portfolio/sections')
      .query({ userId: alice })
      .set('X-User-Id', bob);
    expect(JSON.stringify(sections.body)).not.toContain('Alice');
  });

  it('GET /admin/me returns the display fields of the header’s user (FR-AUTH-17)', async () => {
    const res = await get('/admin/me')
      .query({ userId: alice })
      .set('X-User-Id', bob);
    expect(res.body).toEqual({
      provider: 'google',
      email: 'bob@example.net',
      displayName: 'Bob Ferreira',
      avatarUrl: expect.any(String),
      portfolio: { slug: 'bob', status: 'published' },
    });
  });

  it('GET /admin/me answers 404 for an id that names no user', async () => {
    const res = await get('/admin/me').set('X-User-Id', freshUserId());
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('user_not_found');
  });
});
