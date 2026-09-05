import type { GitHubEmbedCard } from '@openportfolio/registry';

/**
 * URLs for the GitHub stat cards.
 *
 * These are `<img>` sources, not fetch targets. Nothing in this system ever
 * requests them: the URL is written into the markup and the *visitor's*
 * browser asks the card service for the picture. That is what keeps FR-INT-1
 * and NFR-PERF-3 true for this feature by construction rather than by
 * discipline — there is no cache entry, no credential, no sync job and no
 * `integrationConnections` row behind any of it, so there is nothing to go
 * stale and nothing to leak. The accepted cost is recorded in the report: an
 * uncontrolled third party, degrading silently (business req 13.5, FR-INT-5).
 */
const EMBED_HOST = 'https://github-readme-stats.vercel.app';

export { EMBED_HOST };

/**
 * Same vocabulary as the registry's `embedCards` options, aliased rather than
 * restated so the two cannot drift.
 */
export type CardKind = GitHubEmbedCard;

/** Light or dark, resolved by the browser — see GitHubEmbed. */
export type ColorScheme = 'light' | 'dark';

const PATHS: Record<CardKind, string> = {
  stats: '/api',
  languages: '/api/top-langs',
  streak: '/api',
};

/**
 * Parameters that mean something to one card and nothing to the others.
 *
 * The statistics card is asked to drop its star count: stars measure
 * attention rather than work, and the manual figures beside it do not carry
 * one either, so a card showing stars would contradict the text next to it.
 * What is left is the commit and pull-request count.
 *
 * `include_all_commits` is deliberately NOT set. Left off, the card counts
 * commits over the trailing year — the window `commitsLastYear` uses — so the
 * embedded figure and the typed one describe the same thing. Setting it would
 * switch the card to an all-time total and quietly put the two out of step.
 */
const CARD_PARAMS: Record<CardKind, Readonly<Record<string, string>>> = {
  stats: { hide: 'stars' },
  languages: {},
  streak: {},
};

export interface CardDimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * The card service's own output size. Exported because the component must set
 * `width` and `height` on every `<img>`: the browser needs the aspect ratio
 * before the bytes land, or the cards shove the page down as they arrive and
 * Cumulative Layout Shift blows past NFR-PERF-2.
 */
export const CARD_DIMENSIONS: Record<CardKind, CardDimensions> = {
  stats: { width: 495, height: 195 },
  languages: { width: 350, height: 165 },
  streak: { width: 495, height: 195 },
};

/** Matches the `--accent` default in app/globals.css. */
const DEFAULT_ACCENT = '2f5bff';

/** Body copy inside the card, per scheme. The card service takes bare hex. */
const TEXT_COLOR: Record<ColorScheme, string> = {
  dark: 'e6e6e6',
  light: '1a1a1a',
};

export interface EmbedTheme {
  /** The tenant's accent, `#rgb` or `#rrggbb`. Anything else falls back. */
  readonly accent?: string;
}

/**
 * Bare hex digits, or the default.
 *
 * The card service takes a colour as hex without the leading `#`, so the
 * theme's value has to be converted before it can be sent at all. Anything
 * that is not recognisably a hex colour falls back to the default rather than
 * producing a card the service cannot draw.
 */
function hexOrDefault(value: string | undefined): string {
  if (!value) return DEFAULT_ACCENT;
  const hex = value.trim().replace(/^#/, '');
  return /^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex : DEFAULT_ACCENT;
}

/**
 * The URL for one card, in one colour scheme.
 *
 * Every value is written through `URLSearchParams`, which percent-encodes each
 * one. That is what keeps the username inside its own parameter: one carrying
 * `&` or `?` is escaped rather than read as a separator, so it cannot append
 * anything to the request the visitor's browser makes.
 */
export function buildEmbedUrl(
  username: string,
  card: CardKind,
  theme: EmbedTheme,
  scheme: ColorScheme,
): string {
  const accent = hexOrDefault(theme.accent);

  const params = new URLSearchParams({
    username,
    show_icons: 'true',
    hide_border: 'true',
    /* Transparent, so the card sits on the page's own background instead of
       carrying a panel of its own into a theme it knows nothing about. */
    bg_color: '00000000',
    cache_seconds: '21600',
    title_color: accent,
    icon_color: accent,
    text_color: TEXT_COLOR[scheme],
    ...CARD_PARAMS[card],
  });

  return `${EMBED_HOST}${PATHS[card]}?${params.toString()}`;
}

/** `https://github.com/{username}`, for the text link beside the cards. */
export function profileUrlFor(username: string): string {
  return `https://github.com/${encodeURIComponent(username)}`;
}
