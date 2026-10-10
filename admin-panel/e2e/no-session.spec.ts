import { expect, test } from '@playwright/test';

/*
 * FR-AUTH-7 and FR-AUTH-20 with no session, through the dev topology: the dev
 * admin host, `gateway`, and `api`. Needs no account, so it runs wherever the
 * topology does.
 */

const api = (url: string) => new URL(url).pathname.startsWith('/api/');

test('a fresh browser on a guarded route ends at /sign-in', async ({ page }) => {
  const answers: string[] = [];
  page.on('response', (response) => {
    const request = response.request();
    if (api(request.url())) {
      answers.push(
        `${request.method()} ${new URL(request.url()).pathname} ${String(response.status())}`,
      );
    }
  });

  await page.goto('/sections');

  await expect(page).toHaveURL('/sign-in');
  await expect(
    page.getByRole('link', { name: 'Sign in with Google' }),
  ).toBeVisible();
  /* Each hop answered, and answered 401: a proxy fault would be a 5xx here. */
  expect(answers).toContain('GET /api/admin/me 401');
  expect(answers).toContain('POST /api/auth/refresh 401');
  await expect(
    page.getByRole('button', { name: 'Sign out', exact: true }),
  ).toHaveCount(0);
});

test('/sign-in makes no API call', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (api(request.url())) requests.push(request.url());
  });

  await page.goto('/sign-in');
  await expect(
    page.getByRole('link', { name: 'Sign in with Google' }),
  ).toBeVisible();
  await page.waitForLoadState('networkidle');

  expect(requests).toEqual([]);
});
