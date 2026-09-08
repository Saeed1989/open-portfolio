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
  /** Renders an anchor. Mutually exclusive with `onClick`. */
  href?: string;
  /** Renders a button. Mutually exclusive with `href`. */
  onClick?: () => void;
  /** Marks the selected filter for assistive technology. */
  current?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Tag({
  variant = 'neutral',
  href,
  onClick,
  current,
  className,
  children,
}: TagProps) {
  const classes = cn(BASE, VARIANT[variant], className);
  const ariaCurrent = current ? ('true' as const) : undefined;

  if (href) {
    return (
      <a href={href} aria-current={ariaCurrent} className={classes}>
        {children}
      </a>
    );
  }

  /* A filter that only changes local state is a button, not a link — there is
     no destination to navigate to and nothing to open in a new tab. */
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-current={ariaCurrent}
        className={cn(classes, 'cursor-pointer appearance-none')}
      >
        {children}
      </button>
    );
  }

  return (
    <span aria-current={ariaCurrent} className={classes}>
      {children}
    </span>
  );
}
