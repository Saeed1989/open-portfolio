import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import request from 'supertest';
import { SECTION_TYPES } from '@portfolio/registry';
import { validateDraftContent } from '../src/admin/sections/section-content';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { Portfolio } from '../src/schemas/portfolio.schema';
import { userId, type TenantName } from '../src/seed/ids';

/*
 * Onboarding: slug availability, portfolio creation, and the
 * no-portfolio rule of the admin guard (§7.2, FR-AUTH-7, FR-DAT-1).
 * Runs against the seeded fixture; eve is the tenant with no portfolio.
 * Tests run in order and eve's claim is relied on by the ones after it.
 */

let app: INestApplication;
let portfolios: Model<Portfolio>;

/* Users with no portfolio and no `users` row. The admin surface never reads
   `users` for these routes, so a well-formed id is all the guard needs. */
let freshUser = 0;
const fresh = () =>
  `5eed00000000000001ff${(++freshUser).toString(16).padStart(4, '0')}`;

const as = (user: TenantName | string) => ({
  'X-Api-Key': process.env.ADMIN_API_KEY!,
  'X-User-Id':
    user.length === 24 ? user : userId(user as TenantName).toHexString(),
});

const claim = (user: string, body: Record<string, unknown>) =>
  request(app.getHttpServer())
    .post('/admin/portfolio')
    .set(as(user))
    .send(body);

const availability = (user: string, slug: string) =>
  request(app.getHttpServer())
    .get('/admin/slug-availability')
    .query({ slug })
    .set(as(user));

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  app = moduleRef.createNestApplication();
  setupApp(app);
  await app.init();
  portfolios = app.get(getModelToken(Portfolio.name));
});

afterAll(async () => {
  await app.close();
});

describe('a tenant with no portfolio', () => {
  it('GET /admin/me answers portfolio: null', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/me')
      .set(as('eve'));
    expect(res.status).toBe(200);
    expect(res.body.portfolio).toBeNull();
  });

  it.each([
    '/admin/portfolio',
    '/admin/portfolio/sections',
    '/admin/link-health',
  ])('GET %s answers 404 portfolio_not_found', async (path) => {
    const res = await request(app.getHttpServer()).get(path).set(as('eve'));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('portfolio_not_found');
  });
});

describe('POST /admin/portfolio', () => {
  it('eve claims Eve-Dev, stored as eve-dev', async () => {
    const res = await claim('eve', { slug: '  Eve-Dev ', name: 'Eve Martin' });
    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('eve-dev');
    expect(res.body.status).toBe('unpublished');
    expect(res.body.presetId).toBe('software-engineer');
    expect(res.headers.etag).toBeDefined();

    const stored = await portfolios.findOne({ userId: userId('eve') }).lean();
    expect(stored?.slug).toBe('eve-dev');
    expect(stored?.published).toBeNull();
  });

  it('after the claim, /admin/me reports it and content routes answer', async () => {
    const me = await request(app.getHttpServer())
      .get('/admin/me')
      .set(as('eve'));
    expect(me.body.portfolio).toEqual({
      slug: 'eve-dev',
      status: 'unpublished',
    });

    const draft = await request(app.getHttpServer())
      .get('/admin/portfolio')
      .set(as('eve'));
    expect(draft.status).toBe(200);

    const sections = await request(app.getHttpServer())
      .get('/admin/portfolio/sections')
      .set(as('eve'));
    expect(sections.status).toBe(200);
  });

  it('the seeded draft is the software-engineer preset and passes draft validation', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/portfolio')
      .set(as('eve'));
    const sections: {
      type: (typeof SECTION_TYPES)[number];
      enabled: boolean;
      content: Record<string, unknown>;
    }[] = res.body.draft.sections;

    expect(sections.map((s) => s.type)).toEqual([...SECTION_TYPES]);
    expect(sections.filter((s) => s.enabled).map((s) => s.type)).toEqual([
      'hero',
      'projects',
      'skills',
      'contact',
    ]);
    expect(sections[0].content.name).toBe('Eve Martin');
    for (const section of sections) {
      expect(validateDraftContent(section.type, section.content)).toEqual([]);
    }
    expect(res.body.draft.analytics).toBeNull();
  });

  it("claiming alice's slug answers 409 slug_taken", async () => {
    const res = await claim(fresh(), { slug: 'alice' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('slug_taken');
    expect(res.body.errors).toEqual([
      { path: 'slug', message: expect.any(String) },
    ]);
  });

  it('alice claiming a second portfolio answers 409 portfolio_exists', async () => {
    const res = await claim('alice', { slug: 'alice-two' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('portfolio_exists');
  });

  it('portfolio_exists takes precedence over a slug error', async () => {
    const res = await claim('alice', { slug: 'admin' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('portfolio_exists');
  });

  it.each(['ab', '-x-', 'a--b', 'ünï', 'a'.repeat(64)])(
    'invalid slug %j answers 422 slug_invalid',
    async (slug) => {
      const res = await claim(fresh(), { slug });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('slug_invalid');
    },
  );

  it.each(['admin', 'saeed-dev', 'ADMIN'])(
    'reserved slug %j answers 422 slug_reserved',
    async (slug) => {
      const res = await claim(fresh(), { slug });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('slug_reserved');
    },
  );

  it('a malformed body answers 422', async () => {
    expect((await claim(fresh(), {})).status).toBe(422);
    expect(
      (await claim(fresh(), { slug: 'ok-slug', preset: 'nope' })).status,
    ).toBe(422);
    expect(
      (await claim(fresh(), { slug: 'ok-slug', userId: 'x' })).status,
    ).toBe(422);
  });

  it('race: two users claiming one slug — one 201, one 409 slug_taken', async () => {
    const [a, b] = await Promise.all([
      claim(fresh(), { slug: 'race-slug' }),
      claim(fresh(), { slug: 'race-slug' }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect([a, b].find((r) => r.status === 409)!.body.code).toBe('slug_taken');
    expect(await portfolios.countDocuments({ slug: 'race-slug' })).toBe(1);
  });

  it.each([
    ['different slugs', ['race-self-a', 'race-self-b']],
    ['the same slug', ['race-self-c', 'race-self-c']],
  ])(
    'race: one user sending two claims with %s — one portfolio',
    async (_label, slugs) => {
      const user = fresh();
      const results = await Promise.all(
        slugs.map((slug) => claim(user, { slug })),
      );
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(results.find((r) => r.status === 409)!.body.code).toBe(
        'portfolio_exists',
      );
      expect(await portfolios.countDocuments({ userId: user })).toBe(1);
    },
  );
});

describe('GET /admin/slug-availability', () => {
  it.each([
    ['ab', 'ab', 'invalid'],
    ['a--b', 'a--b', 'invalid'],
    ['admin', 'admin', 'reserved'],
    ['saeed-dev', 'saeed-dev', 'reserved'],
    ['alice', 'alice', 'taken'],
    ['Eve-Dev', 'eve-dev', 'taken'],
    ['  Nobody-Here ', 'nobody-here', 'available'],
  ])('%j → %s %s', async (input, slug, status) => {
    const res = await availability(fresh(), input);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ slug, status });
  });

  it('a missing slug is invalid', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/slug-availability')
      .set(as(fresh()));
    expect(res.body).toEqual({ slug: '', status: 'invalid' });
  });

  it('is open to a tenant with a portfolio', async () => {
    expect((await availability('bob', 'nobody-here')).status).toBe(200);
  });

  it('requires the API key and a user id', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/slug-availability')
      .query({ slug: 'x' });
    expect(res.status).toBe(401);
  });

  it('answers 429 after 30 requests a minute from one tenant', async () => {
    const user = fresh();
    for (let i = 0; i < 30; i++) {
      expect((await availability(user, 'nobody-here')).status).toBe(200);
    }
    const limited = await availability(user, 'nobody-here');
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe('rate_limited');

    /* Per tenant: another tenant is unaffected. */
    expect((await availability(fresh(), 'nobody-here')).status).toBe(200);
  });
});
