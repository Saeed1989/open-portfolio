import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, freshUserId } from './helpers';

/*
 * Publish (SRS §2.3, FR-PUB-6, FR-CFG-4). One fresh tenant; tests run in
 * order and each relies on the draft the one before it left.
 */

let app: INestApplication;
const user = { 'X-User-Id': freshUserId() };
const SLUG = 'publish-spec';

const publish = () =>
  request(app.getHttpServer()).post('/admin/publish').set(user);

const publicPage = () =>
  request(app.getHttpServer()).get(`/public/portfolios/${SLUG}`);

async function patchSection(type: string, body: Record<string, unknown>) {
  const draft = await request(app.getHttpServer())
    .get('/admin/portfolio')
    .set(user);
  const res = await request(app.getHttpServer())
    .patch(`/admin/portfolio/sections/${type}`)
    .set(user)
    .set('If-Match', draft.headers.etag)
    .send(body);
  expect(res.status).toBe(200);
}

beforeAll(async () => {
  app = await createApp();
  await request(app.getHttpServer())
    .post('/admin/portfolio')
    .set(user)
    .send({ slug: SLUG });
});

afterAll(async () => {
  await app.close();
});

it('a tenant with no portfolio answers 404', async () => {
  const res = await request(app.getHttpServer())
    .post('/admin/publish')
    .set({ 'X-User-Id': freshUserId() });
  expect(res.status).toBe(404);
});

it('a missing required field refuses the publish, per field', async () => {
  await patchSection('hero', { content: { name: 'Pat' } });

  const res = await publish();
  expect(res.status).toBe(422);
  expect(res.body.code).toBe('validation_failed');
  expect(res.body.errors).toContainEqual({
    path: 'hero.title',
    message: expect.any(String),
  });
  expect((await publicPage()).status).toBe(404);
});

it('a valid draft publishes and is served publicly', async () => {
  await patchSection('hero', { content: { name: 'Pat', title: 'Engineer' } });

  const res = await publish();
  expect(res.status).toBe(200);
  expect(res.body.version).toBe(1);
  expect(res.body.publishedAt).toEqual(expect.any(String));

  const page = await publicPage();
  expect(page.status).toBe(200);
  expect(page.body.data.hero).toEqual({ name: 'Pat', title: 'Engineer' });
  expect(page.body.config.sections).toEqual([
    { type: 'hero', order: expect.any(Number) },
  ]);

  const draft = await request(app.getHttpServer())
    .get('/admin/portfolio')
    .set(user);
  expect(draft.body.status).toBe('published');
  /* Nothing unpublished: the two revisions agree. */
  expect(res.body.publishedDraftRevision).toBe(draft.body.draftRevision);
  expect(draft.body.publishedDraftRevision).toBe(draft.body.draftRevision);
});

it('a draft edit is not live until the next publish', async () => {
  await patchSection('hero', { content: { name: 'Pat', title: 'Lead' } });
  expect((await publicPage()).body.data.hero.title).toBe('Engineer');

  const draft = await request(app.getHttpServer())
    .get('/admin/portfolio')
    .set(user);
  expect(draft.body.publishedDraftRevision).toBe(draft.body.draftRevision - 1);

  expect((await publish()).body.version).toBe(2);
  expect((await publicPage()).body.data.hero.title).toBe('Lead');
});

it('with no enabled section holding content, nothing_to_publish', async () => {
  await patchSection('hero', { enabled: false });

  const res = await publish();
  expect(res.status).toBe(422);
  expect(res.body.code).toBe('nothing_to_publish');
  /* The refused publish left the live page as it was. */
  expect((await publicPage()).body.data.hero.title).toBe('Lead');
});
