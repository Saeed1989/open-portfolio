import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * Wraps a set of Tags in a semantic list. Presentation only — it does not know
 * what the tags mean, so it serves both the stack list and the category filter.
 */
export interface TagListProps {
  /** Announced to assistive technology when the list is a named group. */
  label?: string;
  className?: string;
  children?: ReactNode;
}

export function TagList({ label, className, children }: TagListProps) {
  return (
    <ul
      aria-label={label}
      className={cn('flex flex-wrap gap-8 m-0 p-0 list-none', className)}
    >
      {children}
    </ul>
  );
}

/** A single slot in a TagList. Keeps the <li> out of the caller's markup. */
export function TagListItem({ children }: { children?: ReactNode }) {
  return <li className="min-w-0">{children}</li>;
}
