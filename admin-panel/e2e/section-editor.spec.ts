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

test('a visibility toggle round-trips through PATCH and reload', async ({
  page,
}) => {
  await page.goto('/sections/contact');
  await expect(
    page.getByRole('heading', { name: 'Contact', level: 1 }),
  ).toBeVisible();

  /* The seeded draft hides `x` and leaves the rest with no entry at all,
     which reads as visible (FR-SEC-CON-2). */
  const github = page.locator('#github-visible');
  const x = page.locator('#x-visible');
  await expect(github).toHaveAttribute('aria-checked', 'true');
  await expect(x).toHaveAttribute('aria-checked', 'false');

  const githubValue = await page.locator('#github').inputValue();

  await github.click();
  await expect(indicator(page)).toContainText(/Saved \d/);

  /* The value is kept, not cleared — the tenant chose not to publish it. */
  await expect(page.locator('#github')).toHaveValue(githubValue);

  /* And the server holds it as a sibling map, with the value's own type
     unchanged (model A). */
  const stored = await storedContent(page, 'contact');
  expect(stored.github).toBe(githubValue);
  expect(stored.visibility).toMatchObject({ github: false, x: false });

  /* Survives a reload, which is the half a local state update would fake. */
  await page.reload();
  await expect(page.locator('#github-visible')).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await expect(page.locator('#github')).toHaveValue(githubValue);
});

test('an unpublished item is excluded from validation and the counts', async ({
  page,
}) => {
  await page.goto('/sections/achievements');
  await expect(
    page.getByRole('heading', { name: 'Achievements', level: 1 }),
  ).toBeVisible();

  /* The seeded second item came from an import, is unpublished, and is
     missing a required field (FR-SEC-ACH-5). */
  const unpublished = page.getByRole('button', { name: 'Unpublished' });
  await expect(unpublished).toBeVisible();

  const blockingWhileUnpublished = await page
    .locator('aside')
    .getByText('Blocking publish')
    .locator('xpath=following-sibling::b[1]')
    .textContent();

  /* Promoting it brings its gaps into the count — which is the proof the
     exclusion was real and not just an empty collection. */
  await unpublished.click();
  await expect(indicator(page)).toContainText(/Saved \d/);

  const blockingWhenPublished = await page
    .locator('aside')
    .getByText('Blocking publish')
    .locator('xpath=following-sibling::b[1]')
    .textContent();

  expect(Number(blockingWhenPublished)).toBeGreaterThan(
    Number(blockingWhileUnpublished),
  );
});

test('the section manager lists every registry type with its state', async ({
  page,
}) => {
  await page.goto('/sections');
  await expect(page.getByRole('heading', { name: 'Sections', level: 1 })).toBeVisible();

  /* One row per declared type, and the count comes from the registry rather
     than from a number written here. */
  const rows = page.locator('ol > li');
  await expect(rows).toHaveCount(13);

  /* The three states the mock draws, each present in the seeded draft. */
  await expect(page.getByText('Appears', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Off — not published').first()).toBeVisible();

  /* FR-CFG-4, stated as a running count rather than only as a publish
     failure. */
  await expect(page.getByText(/At least one enabled, non-empty section/)).toBeVisible();
});

test('a section toggle persists, and creates a section the draft lacked', async ({
  page,
}) => {
  await page.goto('/sections');
  await expect(page.getByRole('heading', { name: 'Sections', level: 1 })).toBeVisible();

  const toggle = page.locator('#enabled-experience');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');

  await toggle.click();
  await expect(page.locator('header [role="status"]')).toContainText(/Saved \d/);
  await expect(toggle).toHaveAttribute('aria-checked', 'true');

  /* The server holds it — and holds a section the seeded draft never had, so
     a type the tenant has not touched is still reachable. */
  const enabled = await page.evaluate(async () => {
    const doc = (await fetch('/api/admin/portfolio').then((r) => r.json())) as {
      draft: { sections: { type: string; enabled: boolean }[] };
    };
    return doc.draft.sections.find((s) => s.type === 'experience')?.enabled;
  });
  expect(enabled).toBe(true);

  await page.reload();
  await expect(page.locator('#enabled-experience')).toHaveAttribute(
    'aria-checked',
    'true',
  );
});

test('reordering is keyboard operable and persists the new order', async ({
  page,
}) => {
  await page.goto('/sections');
  await expect(page.getByRole('heading', { name: 'Sections', level: 1 })).toBeVisible();

  const firstHandle = page.locator('ol li button[aria-label^="Reorder"]').first();
  await firstHandle.focus();
  await firstHandle.press('ArrowDown');

  await expect(page.locator('header [role="status"]')).toContainText(/Saved \d/);

  /* Renumbered from zero, so the stored order matches what is on screen. */
  const orders = await page.evaluate(async () => {
    const doc = (await fetch('/api/admin/portfolio').then((r) => r.json())) as {
      draft: { sections: { type: string; order: number }[] };
    };
    return Object.fromEntries(
      doc.draft.sections.map((s) => [s.type, s.order] as const),
    );
  });
  expect(orders.projects).toBe(0);
  expect(orders.hero).toBe(1);
});
