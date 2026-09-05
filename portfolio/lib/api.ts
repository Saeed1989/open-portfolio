import { cache } from 'react';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { SECTION_TYPES, type SectionInstance } from '@openportfolio/registry';
import type { PortfolioTheme } from './theme';

/**
 * The public API client. The only module in this app that performs a fetch.
 *
 * A page render makes exactly one upstream read and zero third-party calls
 * (NFR-PERF-3, FR-INT-1). Integration data — GitHub statistics, RSS posts — is
 * already merged into the payload by the API from its own cache, so nothing
 * here knows a third party exists.
 *
 * `getPortfolio` is wrapped in React's `cache()`, which memoises it for the
 * duration of one request. The layout needs the theme, `generateMetadata`
 * needs the SEO block and the page needs the sections; all three call this and
 * only the first one does any work. Three callers, one read.
 */

export interface PortfolioSeo {
  /** FR-PUB-1. Absent values are derived from hero content at render time. */
  readonly title?: string;
  readonly description?: string;
  readonly keywords?: readonly string[];
  /** FR-PUB-3: uploaded by the tenant or generated at publish time. */
  readonly ogImageUrl?: string;
  readonly ogImageAlt?: string;
  /** FR-PUB-2 / 17.2. */
  readonly twitterHandle?: string;
  readonly canonicalUrl?: string;
}

/**
 * The render-ready document for one tenant.
 *
 * This is the public surface's response shape (SRS §7.1) — published content
 * only, with disabled sections already stripped server-side (FR-TEN-5). It
 * carries no email address, no draft, no integration credentials and no
 * analytics configuration, because the public DTO never contains them.
 */
export interface PortfolioPayload {
  readonly slug: string;
  /** Ordered by `order`. SectionRenderer sorts again; it does not trust this. */
  readonly sections: readonly SectionInstance[];
  readonly theme: PortfolioTheme;
  readonly seo: PortfolioSeo;
  readonly publishedAt: string;
  readonly version: number;
}

/**
 * How long a slug's payload is held in the data cache before the next request
 * refreshes it. Publishing does not wait for this — it calls the internal
 * revalidation endpoint, which drops the tag immediately (FR-PUB-7).
 */
export const REVALIDATE_SECONDS = 3600;

/** The cache tag for one tenant's payload. */
export function portfolioTag(slug: string): string {
  return `portfolio:${slug}`;
}

/**
 * Development fixtures replace the network entirely — they are not a mocked
 * fetch. The swap happens at the top of `getPortfolio`, so there is exactly
 * one branch in the app and no component, primitive or section can tell which
 * side of it produced the payload.
 */
export function useFixtures(): boolean {
  return (
    process.env.NODE_ENV !== 'production' && process.env.USE_FIXTURES === 'true'
  );
}

const FIXTURE_DIR = path.join(process.cwd(), 'fixtures', 'portfolios');
const FIXTURE_FALLBACK = 'default';

/** Enough latency to see a loading state behave like the real thing. */
const FIXTURE_LATENCY_MS = 180;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fixtures are `.json`, so TypeScript cannot check their contents at compile
 * time — `resolveJsonModule` widens every literal, and a JSON module's `type`
 * field is inferred as `string`, never as a `SectionType`. Both paths
 * therefore run through this instead, which is the stronger guarantee anyway:
 * the production response is equally untyped, and a malformed payload from
 * either source fails here, loudly, naming its origin — rather than reaching a
 * section component as a shape it does not expect.
 */
function assertPayload(raw: unknown, source: string): PortfolioPayload {
  const fail = (why: string): never => {
    throw new Error(`Invalid portfolio payload from ${source}: ${why}`);
  };

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return fail('expected an object');
  }

  const value = raw as Record<string, unknown>;

  if (typeof value.slug !== 'string' || value.slug.length === 0) {
    return fail('`slug` must be a non-empty string');
  }
  if (!Array.isArray(value.sections)) {
    return fail('`sections` must be an array');
  }

  const known = new Set<string>(SECTION_TYPES);

  const sections: SectionInstance[] = value.sections.map((entry, index) => {
    const where = `sections[${index}]`;
    if (typeof entry !== 'object' || entry === null) {
      return fail(`${where} must be an object`);
    }
    const section = entry as Record<string, unknown>;

    if (typeof section.type !== 'string' || !known.has(section.type)) {
      return fail(`${where}.type "${String(section.type)}" is not a declared section type`);
    }
    if (typeof section.enabled !== 'boolean') {
      return fail(`${where}.enabled must be a boolean`);
    }
    if (typeof section.order !== 'number') {
      return fail(`${where}.order must be a number`);
    }
    if (section.content === undefined || section.content === null) {
      return fail(`${where}.content is missing`);
    }

    return {
      type: section.type as SectionInstance['type'],
      enabled: section.enabled,
      order: section.order,
      content: section.content,
    };
  });

  if (typeof value.publishedAt !== 'string') {
    return fail('`publishedAt` must be a string');
  }
  if (typeof value.version !== 'number') {
    return fail('`version` must be a number');
  }

  return {
    slug: value.slug,
    sections,
    theme: (value.theme ?? {}) as PortfolioTheme,
    seo: (value.seo ?? {}) as PortfolioSeo,
    publishedAt: value.publishedAt,
    version: value.version,
  };
}

async function readFixture(name: string): Promise<unknown | null> {
  /* Guards against a slug walking out of the fixture directory. Middleware
     has already validated the label, but this path takes a string. */
  if (!/^[a-z0-9-]+$/.test(name)) return null;

  try {
    const file = path.join(FIXTURE_DIR, `${name}.json`);
    return JSON.parse(await readFile(file, 'utf8')) as unknown;
  } catch {
    return null;
  }
}

async function fromFixtures(slug: string): Promise<PortfolioPayload | null> {
  await delay(FIXTURE_LATENCY_MS);

  const named = await readFixture(slug);
  if (named) return assertPayload(named, `fixtures/portfolios/${slug}.json`);

  const fallback = await readFixture(FIXTURE_FALLBACK);
  if (fallback) {
    return assertPayload(
      fallback,
      `fixtures/portfolios/${FIXTURE_FALLBACK}.json`,
    );
  }

  return null;
}

async function fromApi(slug: string): Promise<PortfolioPayload | null> {
  const base = process.env.PORTFOLIO_API_URL;
  if (!base) {
    throw new Error(
      'PORTFOLIO_API_URL is not set. Set it, or run with USE_FIXTURES=true in development.',
    );
  }

  const url = `${base.replace(/\/$/, '')}/public/portfolios/${encodeURIComponent(slug)}`;

  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    /* Per-slug ISR: one upstream read per slug per window, dropped early by
       the internal revalidation endpoint on publish. */
    next: { revalidate: REVALIDATE_SECONDS, tags: [portfolioTag(slug)] },
  });

  /* An unknown, unpublished or suspended slug is one indistinguishable 404
     (FR-TEN-3). This code never learns which it was. */
  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(
      `Portfolio API returned ${response.status} ${response.statusText} for ${url}`,
    );
  }

  return assertPayload(await response.json(), url);
}

/**
 * The whole data layer. Returns null for a slug with nothing published;
 * throws on anything else that went wrong, so a broken upstream surfaces as an
 * error rather than as a silent 404.
 */
export const getPortfolio = cache(
  async (slug: string): Promise<PortfolioPayload | null> =>
    useFixtures() ? fromFixtures(slug) : fromApi(slug),
);
