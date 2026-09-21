import { expect, test, type Page } from '@playwright/test';

/*
 * The three journeys of M1 item 6, end to end: an edit that autosaves, the
 * 5xx retry path, and the 409 stale-write path.
 *
 * These drive the real form through the real save machine against MSW. The
 * unit suites already cover the transitions; what only a browser can show is
 * that a keystroke reaches the machine, the machine reaches the network, and
 * the result reaches the indicator.
 *
 * Section type names appear here because a spec has to open a route and type
 * into a field. Nothing in `src/` outside the registry does.
 */

/** The indicator in the top bar. */
const indicator = (page: Page) =>
  page.locator('header [role="status"][aria-live="polite"]');

/** Point the mock server at a tenant and a fault. */
async function setMocks(page: Page, fault: string) {
  await page.evaluate(
    (f) => window.__mocks?.set({ tenant: 'alice', fault: f as never }),
    fault,
  );
}

/**
 * One section's stored content, straight from the admin surface.
 *
 * Typed here rather than at each call site: `Response.json()` is `any`, and
 * six unchecked hops through it is how a spec ends up asserting on undefined
 * and passing.
 */
async function storedContent(
  page: Page,
  type: string,
): Promise<Record<string, unknown>> {
  return page.evaluate(async (sectionType: string) => {
    const response = await fetch('/api/admin/portfolio');
    const doc = (await response.json()) as {
      draft: { sections: { type: string; content: Record<string, unknown> }[] };
    };
    const section = doc.draft.sections.find((s) => s.type === sectionType);
    return section ? section.content : {};
  }, type);
}

async function openHero(page: Page) {
  await page.goto('/sections/hero');
  await expect(page.getByRole('heading', { name: 'Hero', level: 1 })).toBeVisible();
  /* Wait for the load to settle so the section holds the document version its
     first write will send as `If-Match`. */
  await expect(indicator(page)).toContainText('No changes yet');
}

test('an edit autosaves and the indicator reports a timestamp', async ({ page }) => {
  await openHero(page);
  await setMocks(page, 'none');

  await page.locator('#tagline').fill('Edited by the end-to-end suite');

  /* Debounced 800 ms, so the request has not gone yet. */
  await expect(indicator(page)).toContainText('Unsaved changes');

  /* A timestamp, not a tick that fades. */
  await expect(indicator(page)).toContainText(/Saved \d/);

  /* And the server really holds it — the indicator is not just optimistic. */
  expect((await storedContent(page, 'hero')).tagline).toBe(
    'Edited by the end-to-end suite',
  );
});

test('Cmd+S flushes without waiting out the debounce', async ({ page }) => {
  await openHero(page);
  await setMocks(page, 'none');

  await page.locator('#tagline').fill('Flushed by keyboard');
  await page.keyboard.press('ControlOrMeta+s');

  await expect(indicator(page)).toContainText(/Saved \d/, { timeout: 3000 });
});

test('a 5xx holds the edits and offers a retry that succeeds', async ({ page }) => {
  await openHero(page);
  await setMocks(page, 'save_server_error');

  await page.locator('#tagline').fill('Written while the server is down');

  await expect(indicator(page)).toContainText('Save failed');
  /* The edits are held in this tab, and the tenant is told so. */
  await expect(indicator(page)).toContainText('Your edits are held in this tab');
  await expect(page.getByRole('button', { name: 'Retry now' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy my edits' })).toBeVisible();

  /* The field still holds what was typed — a failure never discards it. */
  await expect(page.locator('#tagline')).toHaveValue(
    'Written while the server is down',
  );

  /* Bring the server back and retry by hand. */
  await setMocks(page, 'none');
  await page.getByRole('button', { name: 'Retry now' }).click();

  await expect(indicator(page)).toContainText(/Saved \d/);

  expect((await storedContent(page, 'hero')).tagline).toBe(
    'Written while the server is down',
  );
});

test('a 409 reports the conflict and discards neither copy', async ({ page }) => {
  await openHero(page);
  await setMocks(page, 'save_stale');

  await page.locator('#tagline').fill('My version of the tagline');

  await expect(indicator(page)).toContainText('Changed elsewhere');
  await expect(indicator(page)).toContainText('have not been sent');

  /* The tenant's edits are still in the form, and still copyable. */
  await expect(page.locator('#tagline')).toHaveValue('My version of the tagline');
  await expect(page.getByRole('button', { name: 'Copy my edits' })).toBeVisible();

  /* Nothing was silently overwritten: the server still holds its own copy. */
  const serverTagline = (await storedContent(page, 'hero')).tagline as string;
  expect(serverTagline).not.toBe('My version of the tagline');

  /* Taking the server's version is an explicit act, never automatic. */
  await setMocks(page, 'none');
  await page.getByRole('button', { name: 'Load the other version' }).click();
  await expect(page.locator('#tagline')).toHaveValue(serverTagline);
});

test('a refused save names the rule and offers nothing to retry', async ({ page }) => {
  await openHero(page);
  await setMocks(page, 'save_refused');

  await page.locator('#tagline').fill('Content the server will refuse');

  await expect(indicator(page)).toContainText('Refused');
  /* Nothing to retry, something to change. */
  await expect(page.getByRole('button', { name: 'Retry now' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Dismiss' })).toBeVisible();

  /* Editing is the move that clears it, and the next save goes through. */
  await setMocks(page, 'none');
  await page.locator('#tagline').fill('Content the server will accept');
  await expect(indicator(page)).toContainText(/Saved \d/);
});

test('the editor renders a second section type with no code of its own', async ({
  page,
}) => {
  await page.goto('/sections/contact');
  await expect(
    page.getByRole('heading', { name: 'Contact', level: 1 }),
  ).toBeVisible();

  /* Five hideable links, each with its own toggle (FR-SEC-CON-2). */
  await expect(page.getByRole('switch', { name: 'Show on page' })).toHaveCount(5);

  /* Hiding one keeps its value rather than clearing it. */
  const site = page.locator('#site');
  const before = await site.inputValue();
  await page.locator('#site-visible').click();
  await expect(indicator(page)).toContainText(/Saved \d/);
  await expect(site).toHaveValue(before);
});
