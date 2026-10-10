import { expect, test, vi } from 'vitest';
import { adminApi, authApi } from './client';

/*
 * D0, FR-EDGE-9: the app speaks only to its own origin. Every request is a
 * relative `/api/...` URL — no scheme, no host, and so nothing that could name
 * `gateway` or `api`.
 */
test('every transport call is a relative /api/ URL', async () => {
  const fetchMock = vi.fn((url: unknown) => {
    void url;
    return Promise.resolve(new Response('{}', { status: 200 }));
  });
  vi.stubGlobal('fetch', fetchMock);

  await Promise.all([
    adminApi.me(),
    adminApi.slugAvailability('a b'),
    adminApi.createPortfolio({ slug: 'alice' }),
    adminApi.portfolio(),
    adminApi.updateSection('hero', { enabled: true }, 1),
    adminApi.updateTheme({} as never),
    adminApi.updateSeo({} as never),
    adminApi.updateSlug('alice'),
    adminApi.integrations(),
    adminApi.syncIntegration('github'),
    adminApi.uploadUrl({ mimeType: 'image/png', bytes: 1, altText: 'a' }),
    adminApi.publish(),
    adminApi.linkHealth(),
    authApi.logout(),
    authApi.logoutAll(),
  ]);

  /* Every method above, so one added later without a call here fails. */
  expect(fetchMock).toHaveBeenCalledTimes(
    Object.keys(adminApi).length + Object.keys(authApi).length,
  );
  for (const [url] of fetchMock.mock.calls) {
    expect(url).toMatch(/^\/api\/(admin|auth)\/[^/]/);
  }
});
