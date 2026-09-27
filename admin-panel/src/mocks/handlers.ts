import { http, HttpResponse } from 'msw';
import type {
  AdminPortfolio,
  Integration,
  PublishResult,
  SlugAvailabilityResult,
} from '../api/dto';
import { draftFor, writeSection } from './draft-store';
import { mockState } from './state';
import { NO_PORTFOLIO, TENANTS } from './tenants';

/*
 * The admin surface, offline.
 *
 * These handlers stand in for `api` behind `edge`, so they answer on the
 * browser-facing prefix `/api/admin/*` rather than `api`'s own `/admin/*` —
 * the rewrite is `edge`'s (FR-EDGE-2), and a handler on the wrong prefix would
 * hide a routing mistake rather than expose it.
 *
 * They do not model identity. `X-User-Id` never reaches this app: it is set by
 * `edge` on the hop the browser cannot see (FR-EDGE-4), so which tenant is
 * being served is a switch here, not a header read.
 */

const RESERVED = new Set([
  'www',
  'api',
  'admin',
  'app',
  'mail',
  'static',
  'cdn',
  'assets',
  'status',
  'blog',
  'help',
  'support',
  'docs',
]);

/** Slugs already held, so `slug_taken` has real collisions (FR-DAT-1). */
const TAKEN = new Set(['alice', 'bob', 'carol', 'dave']);

const SLUG_FORMAT = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function current() {
  const { tenant } = mockState();
  return tenant === 'no-portfolio' ? NO_PORTFOLIO : TENANTS[tenant];
}

/** The envelope of §7.2, which is what `client.ts` parses first. */
function fail(
  status: number,
  code: string,
  message: string,
  fields: ReadonlyArray<{ path: string; message: string; code?: string }> = [],
) {
  return HttpResponse.json({ error: { code, message, fields } }, { status });
}

/** `edge` answers a failed resolve with 401 and no body at all (§7.3). */
const UNAUTHORIZED = new HttpResponse(null, { status: 401 });

/**
 * The faults that apply to every route, in the order `edge` and `api` would
 * reach them: no session stops the request before the admin surface, and a
 * server fault is the admin surface failing once it is reached.
 */
function globalFault(): HttpResponse | null {
  const { fault } = mockState();
  if (fault === 'unauthorized') return UNAUTHORIZED;
  if (fault === 'server') {
    return fail(500, 'internal_error', 'The admin surface failed.');
  }
  return null;
}

/*
 * The tenant's accent (FR-THM-1), not this panel's.
 *
 * It is the one colour literal outside the token file, and deliberately so: a
 * tenant's accent is content this app transports and never styles itself with,
 * so it belongs in the fixture that stands in for the database rather than in
 * a theme token. The value is the seed's.
 */
const TENANT_ACCENT = '#2F54EB';

const DRAFT: AdminPortfolio['draft'] = {
  sections: [
    { type: 'hero', enabled: true, order: 0, content: {} },
    { type: 'projects', enabled: true, order: 1, content: [] },
    { type: 'skills', enabled: true, order: 2, content: [] },
    { type: 'contact', enabled: true, order: 3, content: {} },
  ],
  theme: { accent: TENANT_ACCENT, mode: 'system', fontPairing: 'plex' },
  seo: { title: '', description: '', keywords: [] },
  analytics: null,
};

export const handlers = [
  http.get('/api/admin/me', () => {
    const blocked = globalFault();
    if (blocked) return blocked;
    return HttpResponse.json(current().me);
  }),

  http.get('/api/admin/slug-availability', ({ request }) => {
    const blocked = globalFault();
    if (blocked) return blocked;

    const slug = new URL(request.url).searchParams.get('slug') ?? '';
    const status: SlugAvailabilityResult['status'] = !SLUG_FORMAT.test(slug)
      ? 'invalid'
      : RESERVED.has(slug)
        ? 'reserved'
        : TAKEN.has(slug)
          ? 'taken'
          : 'available';

    return HttpResponse.json({ slug, status } satisfies SlugAvailabilityResult);
  }),

  http.post('/api/admin/portfolio', async ({ request }) => {
    const blocked = globalFault();
    if (blocked) return blocked;

    const { fault } = mockState();

    /* 409 portfolio_exists takes precedence over every slug error (§7.2). */
    if (fault === 'portfolio_exists' || current().me.portfolio !== null) {
      return fail(
        409,
        'portfolio_exists',
        'This account already has a portfolio.',
      );
    }

    const body = (await request.json()) as Partial<{
      name: string;
      slug: string;
      preset: string;
    }>;
    const slug = body.slug ?? '';

    if (fault === 'slug_taken' || TAKEN.has(slug)) {
      return fail(409, 'slug_taken', 'That address is already taken.', [
        {
          path: 'slug',
          code: 'slug_taken',
          message: 'That address is already taken.',
        },
      ]);
    }

    if (fault === 'validation') {
      /* Every failure at once, never only the first (FR-PUB-6). */
      return fail(422, 'validation_failed', 'Some fields need attention.', [
        { path: 'name', code: 'required', message: 'Enter a display name.' },
        {
          path: 'slug',
          code: 'slug_invalid',
          message:
            'Use lowercase letters, numbers and hyphens, starting and ending with a letter or number.',
        },
        { path: 'preset', code: 'unknown_preset', message: 'Choose a preset.' },
      ]);
    }

    if (RESERVED.has(slug)) {
      return fail(422, 'slug_reserved', 'That address is reserved.', [
        {
          path: 'slug',
          code: 'slug_reserved',
          message: 'That address is reserved.',
        },
      ]);
    }

    return HttpResponse.json(
      {
        slug,
        status: 'unpublished',
        registryVersion: 1,
        presetId: body.preset ?? 'software-engineer',
        draft: DRAFT,
        publishedAt: null,
        version: 0,
      } satisfies AdminPortfolio,
      { status: 201 },
    );
  }),

  http.get('/api/admin/portfolio', () => {
    const blocked = globalFault();
    if (blocked) return blocked;

    const tenant = current();
    if (tenant.me.portfolio === null) {
      return fail(404, 'portfolio_not_found', 'No portfolio for this account.');
    }

    const draft = draftFor(mockState().tenant);

    return HttpResponse.json({
      slug: tenant.me.portfolio.slug,
      status: tenant.me.portfolio.status,
      registryVersion: 1,
      presetId: 'software-engineer',
      draft: { ...DRAFT, sections: draft.sections },
      publishedAt:
        tenant.me.portfolio.status === 'unpublished'
          ? null
          : '2026-03-02T14:31:00.000Z',
      version: draft.version,
    } satisfies AdminPortfolio);
  }),

  /*
   * PATCH one section (§7.2), honouring D3's precondition.
   *
   * The order below is the order a server would check in: a fault the
   * developer switched on, then the precondition, then the content rule, then
   * the write. Checking `If-Match` before the content rule matters — a stale
   * write should be reported as stale even when what it carries would also
   * have been refused.
   */
  http.patch('/api/admin/portfolio/sections/:type', async ({ request, params }) => {
    const blocked = globalFault();
    if (blocked) return blocked;

    const { fault, tenant: tenantName } = mockState();
    const tenant = current();
    if (tenant.me.portfolio === null) {
      return fail(404, 'portfolio_not_found', 'No portfolio for this account.');
    }

    const type = String(params['type']);
    const draft = draftFor(tenantName);

    if (fault === 'save_server_error') {
      return fail(500, 'internal_error', 'The admin surface failed.');
    }

    const ifMatch = request.headers.get('If-Match');

    /* `save_stale` moves the document out from under the write, so the 409 is
       produced by the precondition rather than asserted. */
    if (fault === 'save_stale') draft.version += 1;

    if (ifMatch !== null && Number(ifMatch) !== draft.version) {
      return HttpResponse.json(
        {
          error: {
            code: 'stale_write',
            message:
              'This portfolio was saved somewhere else since you loaded it.',
            fields: [],
            current: {
              slug: tenant.me.portfolio.slug,
              status: tenant.me.portfolio.status,
              registryVersion: 1,
              presetId: 'software-engineer',
              draft: { ...DRAFT, sections: draft.sections },
              publishedAt: '2026-03-02T14:31:00.000Z',
              version: draft.version,
            },
          },
        },
        { status: 409 },
      );
    }

    if (fault === 'save_refused') {
      /* A save-time content rule, not a publish gap: the write does not
         happen and the message names the rule (artboard 39). */
      return fail(
        422,
        'save_rule',
        'Impact cannot be saved empty — it is the one content rule enforced at save.',
        [
          {
            path: 'impact',
            code: 'required_at_save',
            message: 'State what changed. This field cannot be saved empty.',
          },
        ],
      );
    }

    const body = (await request.json()) as {
      content?: unknown;
      enabled?: boolean;
      order?: number;
    };
    const written = writeSection(tenantName, type, body);

    return HttpResponse.json({
      slug: tenant.me.portfolio.slug,
      status: tenant.me.portfolio.status,
      registryVersion: 1,
      presetId: 'software-engineer',
      draft: { ...DRAFT, sections: written.sections },
      publishedAt: '2026-03-02T14:31:00.000Z',
      version: written.version,
    } satisfies AdminPortfolio);
  }),

  http.patch('/api/admin/portfolio/slug', async ({ request }) => {
    const blocked = globalFault();
    if (blocked) return blocked;

    const { slug } = (await request.json()) as { slug?: string };
    const tenant = current();

    if (tenant.me.portfolio === null) {
      return fail(404, 'portfolio_not_found', 'No portfolio for this account.');
    }
    /* A no-op is refused rather than accepted, so no success skips
       FR-DAT-2's 301 and slugHistory entry (§7.2). */
    if (slug === tenant.me.portfolio.slug) {
      return fail(422, 'slug_unchanged', 'That is already your address.', [
        {
          path: 'slug',
          code: 'slug_unchanged',
          message: 'That is already your address.',
        },
      ]);
    }
    if (mockState().fault === 'slug_taken' || TAKEN.has(slug ?? '')) {
      return fail(409, 'slug_taken', 'That address is already taken.', [
        {
          path: 'slug',
          code: 'slug_taken',
          message: 'That address is already taken.',
        },
      ]);
    }

    return HttpResponse.json({
      slug: slug ?? '',
      status: tenant.me.portfolio.status,
      registryVersion: 1,
      presetId: 'software-engineer',
      draft: DRAFT,
      publishedAt: '2026-03-02T14:31:00.000Z',
      version: 4,
    } satisfies AdminPortfolio);
  }),

  http.get('/api/admin/integrations', () => {
    const blocked = globalFault();
    if (blocked) return blocked;

    const failing = mockState().fault === 'rss_sync_failing';

    return HttpResponse.json([
      {
        provider: 'github',
        config: { username: 'anakamura' },
        status: 'ok',
        lastSyncAt: '2026-03-02T12:00:00.000Z',
        lastError: null,
        consecutiveFailures: 0,
        cache: {
          payload: { repositories: 34, commits12m: 1204, pullRequests: 187 },
          fetchedAt: '2026-03-02T12:00:00.000Z',
          stale: false,
        },
      },
      {
        provider: 'rss',
        config: { feedUrl: 'https://alice.example.com/feed.xml' },
        /* The last good payload is still served and the entry is marked
           stale; nothing is written to the portfolio (FR-INT-3). Staleness
           is visible here and nowhere on the public page. */
        status: failing ? 'failing' : 'ok',
        lastSyncAt: failing
          ? '2026-02-27T09:00:00.000Z'
          : '2026-03-02T11:00:00.000Z',
        lastError: failing ? 'Feed responded 503 after 3 attempts' : null,
        consecutiveFailures: failing ? 3 : 0,
        cache: {
          payload: {
            posts: [
              {
                title: 'Backfilling a ledger without downtime',
                date: '2026-02-20',
                url: 'https://alice.example.com/ledger-backfill',
              },
            ],
          },
          fetchedAt: '2026-02-27T09:00:00.000Z',
          stale: failing,
        },
      },
    ] satisfies Integration[]);
  }),

  http.post('/api/admin/integrations/:provider/sync', ({ params }) => {
    const blocked = globalFault();
    if (blocked) return blocked;

    const provider = String(params['provider']);
    const failing = mockState().fault === 'rss_sync_failing' && provider === 'rss';

    return HttpResponse.json({
      provider: provider as Integration['provider'],
      config: {},
      status: failing ? 'failing' : 'ok',
      lastSyncAt: failing ? '2026-02-27T09:00:00.000Z' : new Date().toISOString(),
      lastError: failing ? 'Feed responded 503 after 3 attempts' : null,
      consecutiveFailures: failing ? 4 : 0,
      cache: null,
    } satisfies Integration);
  }),

  http.post('/api/admin/publish', () => {
    const blocked = globalFault();
    if (blocked) return blocked;

    /* carol is the fixture publish validation exists to fail on, so a
       publish attempt reports her gaps rather than succeeding. */
    if (mockState().tenant === 'carol' || mockState().fault === 'validation') {
      return fail(422, 'publish_blocked', 'This draft cannot be published.', [
        {
          path: 'projects',
          code: 'min_items',
          message: 'Add at least 3 projects. There are 2.',
        },
        {
          path: 'projects.0.bodies.solution',
          code: 'required',
          message: 'Required to publish.',
        },
        {
          path: 'projects.0.bodies.role',
          code: 'required',
          message: 'Required to publish.',
        },
        {
          path: 'projects.1.impact',
          code: 'required',
          message: 'Required to publish.',
        },
        {
          path: 'skills',
          code: 'prominent_count',
          message: 'Flag between 5 and 8 skills as prominent. There are 3.',
        },
      ]);
    }

    return HttpResponse.json({
      version: 5,
      publishedAt: new Date().toISOString(),
    } satisfies PublishResult);
  }),

  http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),
];
