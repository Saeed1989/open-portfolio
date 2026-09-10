import type { Metadata } from 'next';
import { REGISTRY, type HeroContent } from '@portfolio/registry';
import type { PortfolioPayload } from './api';

/**
 * Builds the page's metadata from `payload.seo`, falling back to hero content
 * (FR-PUB-1, FR-PUB-2, FR-PUB-3).
 *
 * The fallbacks read the hero through the registry's own emptyCondition rather
 * than by poking at fields, so a hero that would not render also does not
 * supply a title — the page never advertises content a visitor cannot see.
 */
function heroOf(payload: PortfolioPayload): HeroContent | null {
  const hero = payload.sections.find(
    (section) => section.type === 'hero' && section.enabled,
  );
  if (!hero) return null;
  if (REGISTRY.hero.emptyCondition(hero.content)) return null;
  return hero.content as HeroContent;
}

/** Two or three sentences is a bio; a meta description is one. */
function firstSentence(text: string, limit = 160): string {
  const trimmed = text.trim();
  if (trimmed.length <= limit) return trimmed;
  const cut = trimmed.slice(0, limit);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(' — '));
  return `${(lastStop > 60 ? cut.slice(0, lastStop) : cut).trimEnd()}…`;
}

/** The tenant's canonical URL wins; the request origin is the fallback. */
function resolveBase(
  canonicalUrl: string | undefined,
  origin: string | undefined,
): URL | undefined {
  for (const candidate of [canonicalUrl, origin]) {
    if (!candidate) continue;
    try {
      return new URL(candidate);
    } catch {
      /* A malformed value must not take the page down over a meta tag. */
    }
  }
  return undefined;
}

export function buildMetadata(
  payload: PortfolioPayload,
  /**
   * The tenant's own origin, e.g. `https://alice.site.com`, taken from the
   * request. Used to resolve a relative OG image path (FR-PUB-3) when the
   * tenant has not set a canonical URL — a crawler cannot fetch `/og.png`.
   */
  origin?: string,
): Metadata {
  const { seo } = payload;
  const hero = heroOf(payload);

  const name = hero?.name?.trim();
  const role = hero?.title?.trim();

  const title =
    seo.title ??
    (name && role ? `${name} — ${role}` : (name ?? payload.slug));

  const description =
    seo.description ??
    (hero?.tagline
      ? firstSentence(hero.tagline)
      : hero?.bio
        ? firstSentence(hero.bio)
        : undefined);

  const keywords = seo.keywords ? [...seo.keywords] : undefined;

  const images = seo.ogImageUrl
    ? [{ url: seo.ogImageUrl, alt: seo.ogImageAlt ?? title }]
    : undefined;

  return {
    metadataBase: resolveBase(seo.canonicalUrl, origin),
    title,
    description,
    keywords,
    alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
    openGraph: {
      type: 'website',
      title,
      description,
      siteName: name ?? payload.slug,
      url: seo.canonicalUrl,
      images,
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title,
      description,
      creator: seo.twitterHandle,
      images,
    },
  };
}
