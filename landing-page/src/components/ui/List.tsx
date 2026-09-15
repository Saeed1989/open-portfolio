import type { ReactNode } from 'react';

/** `between` draws hairlines between children; `all` adds one above the first. */
export type ListDivided = 'none' | 'between' | 'all';
export type ListTone = 'dark' | 'light';

const lines: Record<ListTone, string> = {
  dark: 'divide-border-subtle border-border-subtle',
  light: 'divide-light-border border-light-border',
};

interface ListProps {
  as?: 'ul' | 'ol' | 'dl' | 'div';
  divided?: ListDivided;
  tone?: ListTone;
  /** Layout classes only. */
  className?: string;
  children: ReactNode;
}

export function List({
  as: Tag = 'div',
  divided = 'none',
  tone = 'dark',
  className,
  children,
}: ListProps) {
  const classes = [
    divided !== 'none' && `divide-y ${lines[tone]}`,
    divided === 'all' && 'border-t',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <Tag className={classes || undefined}>{children}</Tag>;
}
