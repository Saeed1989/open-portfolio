'use client';

import { useState } from 'react';
import { Link } from '@/components/ui/Link';
import { Stack } from '@/components/ui/Stack';
import {
  buildEmbedUrl,
  CARD_DIMENSIONS,
  profileUrlFor,
  type CardKind,
} from '@/lib/github-embed';

/**
 * The GitHub stat cards, as third-party image embeds.
 *
 * Nothing here fetches. Each card is an `<img>` whose `src` points at the card
 * service; the visitor's browser makes that request and this system makes
 * none, at render or anywhere else (FR-INT-1, NFR-PERF-3).
 *
 * A client component for exactly one reason — `onError`. A card that 404s, is
 * rate-limited, or whose service is down removes itself from the page, and
 * when the last one goes the cards leave no trace: no heading, no frame, no
 * broken-image icons (business req 13.5, FR-INT-5). There is deliberately no
 * skeleton and no spinner; a card either renders or it was never there.
 *
 * The light/dark swap is `<picture>` plus a `prefers-color-scheme` media
 * query, so the browser picks the right card before first paint. No effect, no
 * state, no flash.
 */
const ALT: Record<CardKind, (username: string) => string> = {
  stats: (username) => `GitHub statistics card for ${username}`,
  languages: (username) => `Most-used programming languages for ${username}`,
  streak: (username) => `GitHub contribution streak for ${username}`,
};

export interface GitHubEmbedProps {
  /** Bare login, not a URL. Empty draws nothing at all. */
  username: string;
  cards: readonly CardKind[];
  /** The tenant's accent, for the card's title and icon colours. */
  accent?: string;
  /**
   * The numbers are already on the page as text.
   *
   * The figures live inside an opaque SVG that this system never reads, so
   * honest alt text for a card is impossible — the descriptive strings above
   * are the best available and they describe the picture, not its contents.
   * Where the tenant has filled in the manual stats the section renders those
   * as a real `<dl>`, which makes the cards duplicate decoration, and
   * decoration takes `alt=""` (NFR-A11Y-4). That is the only configuration in
   * which this section is genuinely accessible.
   */
  decorative?: boolean;
}

interface Card {
  readonly kind: CardKind;
  readonly light: string;
  readonly dark: string;
}

function cardsFor(
  username: string,
  kinds: readonly CardKind[],
  accent: string | undefined,
): Card[] {
  return kinds.map((kind) => ({
    kind,
    light: buildEmbedUrl(username, kind, { accent }, 'light'),
    dark: buildEmbedUrl(username, kind, { accent }, 'dark'),
  }));
}

export function GitHubEmbed({
  username,
  cards,
  accent,
  decorative = false,
}: GitHubEmbedProps) {
  const [failed, setFailed] = useState<readonly CardKind[]>([]);

  if (!username || cards.length === 0) return null;

  const built = cardsFor(username, cards, accent);
  const live = built.filter((card) => !failed.includes(card.kind));

  return (
    <Stack gap="12">
      {live.length > 0 ? (
        <Stack direction="row" wrap gapX="16" gapY="12">
          {live.map((card) => {
            const { width, height } = CARD_DIMENSIONS[card.kind];
            return (
              <picture key={card.kind}>
                <source
                  media="(prefers-color-scheme: dark)"
                  srcSet={card.dark}
                />
                <img
                  src={card.light}
                  alt={decorative ? '' : ALT[card.kind](username)}
                  width={width}
                  height={height}
                  loading="lazy"
                  decoding="async"
                  /* The intrinsic size reserves the box; these two let it
                     shrink below 320px without distorting it (FR-MED-6,
                     NFR-PERF-2, NFR-RESP-1). */
                  style={{ maxWidth: '100%', height: 'auto' }}
                  onError={() =>
                    setFailed((current) =>
                      current.includes(card.kind)
                        ? current
                        : [...current, card.kind],
                    )
                  }
                />
              </picture>
            );
          })}
        </Stack>
      ) : null}

      {/* Outside the error-hiding logic on purpose: the link is our own text,
          not the third party's picture, and it is what the section falls back
          to when every card has gone (FR-INT-4, FR-INT-5). */}
      <Link href={profileUrlFor(username)} variant="underline">
        github.com/{username}
      </Link>
    </Stack>
  );
}
