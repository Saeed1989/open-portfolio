import type { ReactNode } from 'react';

export type CardVariant = 'surface' | 'selected';
export type CardSize = 'sm' | 'md';

const variants: Record<CardVariant, string> = {
  surface: 'from-surface-from to-surface-to',
  selected: 'from-selected-from to-selected-to ring-1 ring-accent-ink-strong/30',
};

const sizes: Record<CardSize, string> = {
  sm: 'rounded-md p-4',
  md: 'rounded-xl p-6',
};

interface CardProps {
  as?: 'div' | 'li' | 'article';
  variant?: CardVariant;
  size?: CardSize;
  /** Layout classes only. */
  className?: string;
  children: ReactNode;
}

export function Card({
  as: Tag = 'div',
  variant = 'surface',
  size = 'md',
  className,
  children,
}: CardProps) {
  const classes = ['bg-linear-135 shadow-lift-1', variants[variant], sizes[size], className]
    .filter(Boolean)
    .join(' ');

  return <Tag className={classes}>{children}</Tag>;
}
