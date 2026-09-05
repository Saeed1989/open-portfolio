import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { SectionRenderer } from '@/components/sections/SectionRenderer';
import { getPortfolio, type PortfolioPayload } from '@/lib/api';
import { buildMetadata } from '@/lib/seo';
import { SLUG_HEADER } from '@/lib/tenant';

/**
 * The container. The only data-aware component in the tree.
 *
 * It resolves the slug from the header middleware set, calls `getPortfolio`
 * once, and hands each section nothing but its own content object. No section,
 * no primitive and no child fetches anything, holds the payload, or knows the
 * slug — the whole tree below this file is a pure function of its props.
 *
 * `getPortfolio` is memoised per request, so this call, the layout's theme
 * lookup and `generateMetadata` below are one upstream read between them
 * (NFR-PERF-3).
 *
 * Rendering is dynamic because tenancy comes from the Host header. Per-slug
 * caching therefore lives in the fetch data cache, tagged `portfolio:<slug>` —
 * see lib/api.ts — which is what the internal revalidation endpoint drops on
 * publish. Full-route ISR would require middleware to rewrite the tenant into
 * the pathname; the header contract asked for here rules that out.
 */
async function currentSlug(): Promise<string | null> {
  return (await headers()).get(SLUG_HEADER);
}

/**
 * A missing slug (apex host, reserved label) and an unpublished or suspended
 * one both land here identically. Neither this function nor the 404 it renders
 * can tell them apart (FR-TEN-3).
 */
async function loadPortfolio(): Promise<PortfolioPayload> {
  const slug = await currentSlug();
  if (!slug) notFound();

  const portfolio = await getPortfolio(slug);
  if (!portfolio) notFound();

  return portfolio;
}

/** The tenant's own origin, for resolving relative OG image paths. */
async function currentOrigin(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  if (!host) return undefined;

  const proto =
    requestHeaders.get('x-forwarded-proto') ??
    (host.startsWith('localhost') || host.endsWith('.localhost')
      ? 'http'
      : 'https');

  return `${proto}://${host}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const slug = await currentSlug();
  const portfolio = slug ? await getPortfolio(slug) : null;

  /* The 404 sets its own noindex metadata; nothing to advertise here. */
  if (!portfolio) return { title: 'Not found', robots: { index: false } };

  return buildMetadata(portfolio, await currentOrigin());
}

export default async function PortfolioPage() {
  const portfolio = await loadPortfolio();

  /*
   * No filtering here. SectionRenderer drops disabled sections, unknown types
   * and anything satisfying its registry emptyCondition, then orders what is
   * left — duplicating any of that would give two places to disagree about
   * FR-CFG-2.
   */
  return (
    <main id="main">
      <SectionRenderer sections={portfolio.sections} theme={portfolio.theme} />
    </main>
  );
}
