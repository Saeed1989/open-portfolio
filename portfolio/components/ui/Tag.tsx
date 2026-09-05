import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * A pill. The design uses it two ways: as a static label for a tech-stack
 * entry, and as the project category filter, where the selected pill takes the
 * accent fill.
 *
 * Rendering as an anchor or a button is the caller's choice — a filter that
 * navigates is a link, one that only changes local state is a button.
 */
export type TagVariant = 'neutral' | 'selected';

const BASE =
  'inline-flex items-center min-h-control px-14 rounded-pill no-underline font-sans text-compact font-medium leading-none';

const VARIANT: Record<TagVariant, string> = {
  neutral: 'bg-surface text-text border border-border',
  selected: 'bg-accent text-accent-on border border-accent',
};

export interface TagProps {
  variant?: TagVariant;
  /** Renders an anchor. Mutually exclusive with `onClick`-only usage. */
  href?: string;
  /** Marks the selected filter for assistive technology. */
  current?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Tag({
  variant = 'neutral',
  href,
  current,
  className,
  children,
}: TagProps) {
  const classes = cn(BASE, VARIANT[variant], className);

  if (href) {
    return (
      <a
        href={href}
        aria-current={current ? 'true' : undefined}
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <span aria-current={current ? 'true' : undefined} className={classes}>
      {children}
    </span>
  );
}
