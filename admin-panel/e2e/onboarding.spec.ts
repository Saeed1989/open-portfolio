import { expect, test, type Page } from '@playwright/test';

/*
 * FR-AUTH-7 and the claim screen (artboard E1), against MSW.
 *
 * The mock state is written to localStorage before the app loads, because the
 * gate reads `GET /admin/me` on the first render.
 */

async function start(page: Page, tenant: string, fault = 'none', path = '/sections') {
  await page.addInitScript(
    (state) => {
      localStorage.setItem('openfolio.mocks', JSON.stringify(state));
    },
    { tenant, fault },
  );
  await page.goto(path);
}

const slugInput = (page: Page) =>
  page.getByRole('textbox', { name: 'Subdomain' });
const claimButton = (page: Page) =>
  page.getByRole('button', { name: 'Claim subdomain' });
/* The field's own slots. Each verdict is also in an sr-only live region, so
   an unscoped text match would find it twice. */
const slugHint = (page: Page) => page.locator('#onboarding-slug-hint');
const slugError = (page: Page) => page.locator('#onboarding-slug-error');

test('a tenant with no portfolio is sent to the claim screen from any route', async ({
  page,
}) => {
  await start(page, 'no-portfolio', 'none', '/sections/hero');
  await expect(page).toHaveURL(/\/onboarding\/slug$/);
  await expect(
    page.getByRole('heading', { name: 'Claim your portfolio' }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Display name' })).toHaveValue(
    'Eve Martin',
  );
});

test('a tenant with a portfolio is sent away from the claim screen', async ({
  page,
}) => {
  await start(page, 'alice', 'none', '/onboarding/slug');
  await expect(page).toHaveURL(/\/sections$/);
});

test('each verdict is shown, and the check is debounced', async ({ page }) => {
  await start(page, 'no-portfolio');
  const checks: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/admin/slug-availability')) {
      checks.push(new URL(request.url()).searchParams.get('slug') ?? '');
    }
  });

  await slugInput(page).fill('ab');
  await expect(slugError(page)).toContainText('cannot start or end with a hyphen');
  await expect(claimButton(page)).toBeDisabled();

  await slugInput(page).fill('Admin');
  await expect(slugError(page)).toContainText('Reserved for the platform');

  await slugInput(page).fill('alice');
  await expect(slugError(page)).toContainText('Taken — either in use');
  await expect(claimButton(page)).toBeDisabled();

  checks.length = 0;
  await slugInput(page).fill('');
  await slugInput(page).pressSequentially('Eve-Dev', { delay: 40 });
  await expect(slugHint(page)).toContainText('eve-dev.openfolio.site · Available');
  await expect(claimButton(page)).toBeEnabled();
  /* Typed faster than the 400 ms debounce: one check, for the final value. */
  expect(checks).toEqual(['eve-dev']);
});

test('a successful claim lands on the dashboard', async ({ page }) => {
  await start(page, 'no-portfolio');
  await slugInput(page).fill('Eve-Dev');
  await expect(slugHint(page)).toContainText('Available.');
  await claimButton(page).click();

  await expect(page).toHaveURL(/\/sections$/);
  await expect(page.getByRole('heading', { name: 'Sections', level: 1 })).toBeVisible();
});

test('a lost race is reported on the field and keeps what was typed', async ({
  page,
}) => {
  await start(page, 'no-portfolio', 'slug_taken');
  await slugInput(page).fill('eve-dev');
  await expect(slugHint(page)).toContainText('Available.');
  await claimButton(page).click();

  await expect(slugError(page)).toContainText('Claimed by someone else');
  await expect(slugInput(page)).toHaveValue('eve-dev');
  await expect(slugInput(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(claimButton(page)).toBeDisabled();

  /* Editing the slug clears the refusal. */
  await slugInput(page).fill('eve-dev2');
  await expect(page.getByText('Claimed by someone else')).toHaveCount(0);
});

test('a rate-limited check is reported and does not block the claim', async ({
  page,
}) => {
  await start(page, 'no-portfolio', 'rate_limited');
  await slugInput(page).fill('eve-dev');
  await expect(slugHint(page)).toContainText('Too many checks in a minute');
  await expect(claimButton(page)).toBeEnabled();
});

test('an existing portfolio at submit offers the dashboard', async ({ page }) => {
  await start(page, 'no-portfolio', 'portfolio_exists');
  await slugInput(page).fill('eve-dev');
  await expect(slugHint(page)).toContainText('Available.');
  await claimButton(page).click();

  await expect(
    page.getByRole('heading', { name: 'You already have a portfolio' }),
  ).toBeVisible();
});

test('the claim screen has no axe violations, including its error state', async ({
  page,
}) => {
  await start(page, 'no-portfolio');
  await slugInput(page).fill('admin');
  await expect(slugError(page)).toContainText('Reserved for the platform');

  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: { run: () => Promise<{ violations: { id: string }[] }> };
    }).axe;
    return (await axe.run()).violations.map((v) => v.id);
  });
  expect(violations).toEqual([]);
});
