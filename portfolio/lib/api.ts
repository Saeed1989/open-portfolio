import { cache } from 'react';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { SECTION_TYPES, type SectionInstance } from '@portfolio/registry';
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
  /**
   * Fixture-only. The §7.1 render payload carries neither, and nothing in
   * this app reads them — they survive because the fixtures declare them and
   * dropping a field a fixture sets would be a silent contract change.
   */
  readonly publishedAt?: string;
  readonly version?: number;
}

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

  if (value.publishedAt !== undefined && typeof value.publishedAt !== 'string') {
    return fail('`publishedAt` must be a string when present');
  }
  if (value.version !== undefined && typeof value.version !== 'number') {
    return fail('`version` must be a number when present');
  }

  return {
    slug: value.slug,
    sections,
    theme: (value.theme ?? {}) as PortfolioTheme,
    seo: (value.seo ?? {}) as PortfolioSeo,
    publishedAt: value.publishedAt as string | undefined,
    version: value.version as number | undefined,
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

/**
 * The §7.1 render payload, rejoined into the shape this app renders from.
 *
 * The public surface returns two halves: `config.sections` — `{ type, order }`
 * for each section that survived the publish — and `data`, holding each
 * survivor's content object keyed by type. The tree below `getPortfolio`
 * wants one array with content inline, so the halves are rejoined here. This
 * is the only function in the app that knows the wire shape and the render
 * shape differ; `fromFixtures` produces the render shape directly.
 *
 * `enabled` is synthesised as `true` rather than read: FR-TEN-5 removes
 * disabled sections when the published tree is built, so a section listed in
 * `config.sections` is enabled by construction and the wire carries no flag
 * to copy. `slug` likewise comes from the caller — §7.1 does not return it.
 *
 * Structural checks only. The rejoined object then goes through
 * `assertPayload`, so both sources land on one validator and one error
 * vocabulary.
 */
function fromRenderPayload(
  raw: unknown,
  slug: string,
  source: string,
): PortfolioPayload {
  const fail = (why: string): never => {
    throw new Error(`Invalid portfolio payload from ${source}: ${why}`);
  };

  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

  if (!isRecord(raw)) return fail('expected an object');
  if (!isRecord(raw.config)) return fail('`config` must be an object');
  if (!isRecord(raw.data)) return fail('`data` must be an object');
  if (!Array.isArray(raw.config.sections)) {
    return fail('`config.sections` must be an array');
  }

  const { config, data } = raw;

  const sections = (config.sections as unknown[]).map((entry, index) => {
    const ref = isRecord(entry) ? entry : {};
    const type = String(ref.type);

    /* §7.1: one key in `data` per entry in `config.sections`, and no other.
       A gap either way is a builder defect (FR-REG-9), not a state to render
       around — so it fails here naming the half that is missing, rather than
       reaching assertPayload as an absent `content`. */
    if (!(type in data)) {
      return fail(
        `config.sections[${index}] is "${type}", but data.${type} is missing`,
      );
    }

    return {
      type: ref.type,
      enabled: true,
      order: ref.order,
      content: data[type],
    };
  });

  return assertPayload(
    { slug, sections, theme: config.theme, seo: config.seo },
    source,
  );
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
    /* TODO(FR-PUB-7): restore ISR + on-demand revalidate —
       `next: { revalidate, tags: [portfolioTag(slug)] }`. The endpoint at
       app/api/internal/revalidate already exists and still calls
       `revalidateTag(portfolioTag(slug))`, but nothing tags this fetch any
       more, so that call is inert until this line goes back. Every render
       reads upstream meanwhile, against NFR-PERF-1 and NFR-PERF-3's budget. */
    cache: 'no-store',
  });

  /* An unknown, unpublished or suspended slug is one indistinguishable 404
     (FR-TEN-3). This code never learns which it was. */
  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(
      `Portfolio API returned ${response.status} ${response.statusText} for ${url}`,
    );
  }

  return fromRenderPayload(await response.json(), slug, url);
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
