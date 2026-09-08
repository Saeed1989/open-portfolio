import type { ReactNode } from 'react';
import { cn } from './cn';
import type { SpaceToken } from './Stack';

/**
 * The design's auto-fit grid.
 *
 * Every grid in spec/uiDesign/portfolio.html is
 * `repeat(auto-fit, minmax(min(100%, X), 1fr))` — it never states a column
 * count, so the layout reflows purely on available width and needs no
 * breakpoint. The four `X` values live as `--track-*` tokens and are exposed
 * through tailwind.config.ts, so `tracks` here names a token rather than
 * smuggling a pixel value into an arbitrary class.
 *
 * `min(100%, X)` is what keeps a single column from overflowing below 320px
 * (NFR-RESP-1); `skills` additionally satisfies NFR-RESP-2, collapsing to one
 * column under 640px because its 300px floor plus the page gutters no longer
 * fit two.
 */
export type GridTracks = 'cards' | 'skills' | 'groups' | 'pairs';

const TRACKS: Record<GridTracks, string> = {
  cards: 'grid-cols-cards',
  skills: 'grid-cols-skills',
  groups: 'grid-cols-groups',
  pairs: 'grid-cols-pairs',
};

const GAP: Record<SpaceToken, string> = {
  '0': 'gap-0',
  '2': 'gap-2',
  '4': 'gap-4',
  '5': 'gap-5',
  '6': 'gap-6',
  '8': 'gap-8',
  '10': 'gap-10',
  '12': 'gap-12',
  '14': 'gap-14',
  '16': 'gap-16',
  '18': 'gap-18',
  '20': 'gap-20',
  '22': 'gap-22',
  '24': 'gap-24',
  '28': 'gap-28',
  '32': 'gap-32',
  '40': 'gap-40',
  '48': 'gap-48',
  'grid-gap': 'gap-grid-gap',
  'skill-gap': 'gap-skill-gap',
  'group-gap': 'gap-group-gap',
  'contact-gap': 'gap-contact-gap',
  'hero-gap': 'gap-hero-gap',
  'stack-sm': 'gap-stack-sm',
  'stack-md': 'gap-stack-md',
  'stack-lg': 'gap-stack-lg',
  'block-gap': 'gap-block-gap',
};

export interface GridProps {
  as?: 'div' | 'ul' | 'ol';
  tracks: GridTracks;
  gap?: SpaceToken;
  /** Aligns items to the top rather than stretching them to equal height. */
  alignStart?: boolean;
  label?: string;
  className?: string;
  children?: ReactNode;
}

export function Grid({
  as: Component = 'div',
  tracks,
  gap,
  alignStart = false,
  label,
  className,
  children,
}: GridProps) {
  const isList = Component === 'ul' || Component === 'ol';

  return (
    <Component
      aria-label={label}
      className={cn(
        'grid',
        TRACKS[tracks],
        gap && GAP[gap],
        alignStart && 'items-start',
        isList && 'm-0 p-0 list-none',
        className,
      )}
    >
      {children}
    </Component>
  );
}
