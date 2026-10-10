import { expect, test } from '@playwright/test';

/*
 * M10a's stopping condition, end to end through `gateway`: §2.5, §2.6 step 4,
 * FR-AUTH-7, FR-AUTH-14, FR-AUTH-20.
 *
 * Needs a Google account that signs in with a password alone — no second
 * factor and no challenge — in E2E_GOOGLE_EMAIL and E2E_GOOGLE_PASSWORD.
 */
const email = process.env['E2E_GOOGLE_EMAIL'];
const password = process.env['E2E_GOOGLE_PASSWORD'];

const REFRESH = '/api/auth/refresh';
const SIGNED_IN = /\/(sections|onboarding\/slug)$/;

/* At file level, so a run without credentials launches no browser. */
test.skip(
  email === undefined || password === undefined,
  'E2E_GOOGLE_EMAIL and E2E_GOOGLE_PASSWORD are not set',
);

test('sign-in round trip, refresh on an expired access JWT, and sign-out', async ({
  page,
  context,
}) => {
  /* Fresh browser: /me 401 → refresh 401 → sign-in. */
  await page.goto('/sections');
  await expect(page).toHaveURL('/sign-in');

  await page.getByRole('link', { name: 'Sign in with Google' }).click();
  await page.getByLabel('Email or phone').fill(email ?? '');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Enter your password').fill(password ?? '');
  await page.getByRole('button', { name: 'Next' }).click();

  /* Callback → admin → /me 200 → whichever branch FR-AUTH-7 picks. */
  await expect(page).toHaveURL(SIGNED_IN);

  /* FR-AUTH-3, as the admin host returned them (FR-EDGE-9): host-only — no
     Domain, so no leading dot — and scoped to /api. */
  const host = new URL(page.url()).hostname;
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === 'of_at')).toMatchObject({
    domain: host,
    path: '/api',
  });
  expect(cookies.find((cookie) => cookie.name === 'of_rt')).toMatchObject({
    domain: host,
    path: '/api/auth',
  });
  expect((await page.request.get('/api/admin/me')).status()).toBe(200);

  /* of_at gone, of_rt intact: the next admin request costs one refresh. */
  await context.clearCookies({ name: 'of_at' });
  const refreshes: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === REFRESH)
      refreshes.push(request.url());
  });
  await page.reload();
  await expect(page).toHaveURL(SIGNED_IN);
  await expect(
    page.getByRole('button', { name: 'Sign out', exact: true }),
  ).toBeVisible();
  expect(refreshes).toHaveLength(1);

  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL('/sign-in');

  await page.goto('/sections');
  await expect(page).toHaveURL('/sign-in');
});
