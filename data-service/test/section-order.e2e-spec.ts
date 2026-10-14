import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, freshUserId } from './helpers';

/*
 * Reordering a section through PATCH /admin/portfolio/sections/:type.
 */

let app: INestApplication;
const user = { 'X-User-Id': freshUserId() };

const patch = (type: string, body: Record<string, unknown>, ifMatch: string) =>
  request(app.getHttpServer())
    .patch(`/admin/portfolio/sections/${type}`)
    .set(user)
    .set('If-Match', ifMatch)
    .send(body);

beforeAll(async () => {
  app = await createApp();
  await request(app.getHttpServer())
    .post('/admin/portfolio')
    .set(user)
    .send({ slug: 'section-order' });
});

afterAll(async () => {
  await app.close();
});

it('order is stored and drives the listing order', async () => {
  const before = await request(app.getHttpServer())
    .get('/admin/portfolio/sections')
    .set(user);
  expect(before.body.sections[0].type).toBe('hero');

  const res = await patch('hero', { order: 99 }, before.headers.etag);
  expect(res.status).toBe(200);
  expect(res.body.section.order).toBe(99);

  const after = await request(app.getHttpServer())
    .get('/admin/portfolio/sections')
    .set(user);
  expect(after.body.sections.at(-1).type).toBe('hero');
});

it.each([-1, 1.5, '2'])('order %j answers 4xx', async (order) => {
  const current = await request(app.getHttpServer())
    .get('/admin/portfolio/sections')
    .set(user);
  const res = await patch('hero', { order }, current.headers.etag);
  expect([400, 422]).toContain(res.status);
});
