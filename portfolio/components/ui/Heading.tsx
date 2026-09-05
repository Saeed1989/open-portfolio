import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * A heading whose semantic level is chosen independently of its size, so a
 * section can sit at the right place in the document outline without being
 * forced into a particular visual weight.
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeadingVisual =
  | 'display'
  | 'heading'
  | 'subheading'
  | 'card'
  | 'group';

const VISUAL: Record<HeadingVisual, string> = {
  display: 'text-display leading-display tracking-display font-semibold',
  heading: 'text-heading leading-heading tracking-heading font-semibold',
  subheading: 'text-subheading leading-heading tracking-heading font-semibold',
  card: 'text-card-title leading-title tracking-title font-semibold',
  /* The uppercase rule over a skill category column. */
  group:
    'text-group leading-none tracking-widest font-medium uppercase text-text-muted',
};

export interface HeadingProps {
  level: HeadingLevel;
  /** Visual weight. Defaults to the size conventionally paired with `level`. */
  visual?: HeadingVisual;
  /** Required when a section labels itself with aria-labelledby. */
  id?: string;
  className?: string;
  children?: ReactNode;
}

const DEFAULT_VISUAL: Record<HeadingLevel, HeadingVisual> = {
  1: 'display',
  2: 'heading',
  3: 'card',
  4: 'card',
  5: 'card',
  6: 'card',
};

export function Heading({
  level,
  visual,
  id,
  className,
  children,
}: HeadingProps) {
  const Component = `h${level}` as const;
  return (
    <Component
      id={id}
      className={cn(
        'font-display break-words',
        /* `group` sets its own muted colour; everything else is body text. */
        (visual ?? DEFAULT_VISUAL[level]) === 'group' ? '' : 'text-text',
        VISUAL[visual ?? DEFAULT_VISUAL[level]],
        className,
      )}
    >
      {children}
    </Component>
  );
}
