import type { CSSProperties } from 'react';

/**
 * Theme constants and the mapping from a tenant's theme to custom properties.
 *
 * FR-THM-2: theme values render as CSS custom properties on the document root.
 * No per-tenant stylesheet is generated or stored, and nothing here is baked
 * into the build — the token layer in globals.css supplies every default, and
 * a tenant overrides only what they have configured.
 *
 * FR-THM-6: a tenant supplies values, never CSS. Everything below is either a
 * colour string written into a named property or an id looked up in a table
 * declared here. There is no path from tenant input to a rule.
 */

/** FR-THM-1: a curated list, not a free font field. */
export type FontPairingId = 'grotesk-spline' | 'grotesk-inter' | 'serif-sans';

export interface FontPairing {
  readonly id: FontPairingId;
  readonly label: string;
  /** Headings. */
  readonly display: string;
  /** Body copy. */
  readonly sans: string;
  /** Families to request from the font CDN, in `family=` form. */
  readonly webfonts: readonly string[];
}

const SYSTEM_SANS = 'ui-sans-serif, system-ui, sans-serif';
const SYSTEM_SERIF = 'ui-serif, Georgia, serif';

export const FONT_PAIRINGS: Record<FontPairingId, FontPairing> = {
  /* The approved design's pairing, and the default. */
  'grotesk-spline': {
    id: 'grotesk-spline',
    label: 'Space Grotesk / Spline Sans',
    display: `'Space Grotesk', ${SYSTEM_SANS}`,
    sans: `'Spline Sans', ${SYSTEM_SANS}`,
    webfonts: [
      'Space+Grotesk:wght@400;500;600;700',
      'Spline+Sans:wght@400;500;600',
    ],
  },
  'grotesk-inter': {
    id: 'grotesk-inter',
    label: 'Space Grotesk / Inter',
    display: `'Space Grotesk', ${SYSTEM_SANS}`,
    sans: `'Inter', ${SYSTEM_SANS}`,
    webfonts: ['Space+Grotesk:wght@400;500;600;700', 'Inter:wght@400;500;600'],
  },
  'serif-sans': {
    id: 'serif-sans',
    label: 'Fraunces / Spline Sans',
    display: `'Fraunces', ${SYSTEM_SERIF}`,
    sans: `'Spline Sans', ${SYSTEM_SANS}`,
    webfonts: [
      'Fraunces:opsz,wght@9..144,400;9..144,600',
      'Spline+Sans:wght@400;500;600',
    ],
  },
};

export const DEFAULT_FONT_PAIRING: FontPairingId = 'grotesk-spline';

/**
 * The pairing for an id, falling back to the default for one this build does
 * not know.
 *
 * `PortfolioTheme.fontPairing` is typed `FontPairingId`, but that types our own
 * constants, not the payload: the value arrives from the public API as JSON and
 * is cast, never validated (lib/api.ts). An id from a newer admin, an older
 * build, or a hand-edited document therefore reaches this map as a miss, and an
 * unguarded lookup would throw inside the root layout — taking that tenant's
 * whole page down over a font. FR-THM-1's curated list lives here rather than
 * in packages/registry, so nothing upstream can reject the value first.
 */
function pairingFor(id: string | undefined): FontPairing {
  return (
    FONT_PAIRINGS[id as FontPairingId] ?? FONT_PAIRINGS[DEFAULT_FONT_PAIRING]
  );
}

/** FR-THM-1: light, dark, or follow the visitor's system setting. */
export type ThemeMode = 'light' | 'dark' | 'system';

export interface PortfolioTheme {
  /**
   * Accent colour. The API rejects a value failing WCAG AA against both
   * backgrounds and offers the nearest compliant shade (FR-THM-3), so anything
   * arriving here has already passed.
   */
  readonly accent?: string;
  /** Hover / secondary accent ink, computed alongside `accent` at publish. */
  readonly accentInk?: string;
  /** Foreground on an accent fill, likewise computed. */
  readonly accentOn?: string;
  readonly mode?: ThemeMode;
  readonly fontPairing?: FontPairingId;
}

/**
 * The custom properties a tenant's theme writes onto <html>.
 *
 * Only configured values are emitted. An unset property is simply absent, so
 * the token layer's own value in globals.css continues to apply — a tenant
 * with no theme gets the design's defaults with no inline style at all.
 */
export function themeStyle(theme: PortfolioTheme | undefined): CSSProperties {
  const style: Record<string, string> = {};
  if (!theme) return style as CSSProperties;

  if (theme.accent) style['--accent'] = theme.accent;
  if (theme.accentInk) style['--accent-ink'] = theme.accentInk;
  if (theme.accentOn) style['--accent-on'] = theme.accentOn;

  const pairing = pairingFor(theme.fontPairing);
  style['--font-display'] = pairing.display;
  style['--font-sans'] = pairing.sans;

  /* Tells the browser which form-control and scrollbar palette to paint,
     matching whatever the token layer is about to resolve to. */
  style.colorScheme = theme.mode === 'system' ? 'light dark' : (theme.mode ?? 'light');

  return style as CSSProperties;
}

/**
 * The `data-theme` attribute value.
 *
 * `system` is a real attribute value rather than an absent one: globals.css
 * carries a `prefers-color-scheme` block scoped to `[data-theme='system']`, so
 * the visitor's setting is honoured with no client JavaScript and no flash.
 */
export function themeAttribute(theme: PortfolioTheme | undefined): ThemeMode {
  return theme?.mode ?? 'light';
}

/** The font CDN stylesheet URL for a theme's pairing. */
export function fontStylesheetHref(theme: PortfolioTheme | undefined): string {
  const pairing = pairingFor(theme?.fontPairing);
  const families = pairing.webfonts.map((f) => `family=${f}`).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
