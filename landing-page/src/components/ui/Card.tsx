import type { ReactNode } from 'react';

export type CardVariant = 'surface' | 'selected' | 'glass';
export type CardSize = 'sm' | 'md' | 'bar';

const variants: Record<CardVariant, string> = {
  surface: 'from-surface-from to-surface-to',
  selected: 'from-selected-from to-selected-to ring-1 ring-accent-ink-strong/30',
  // translucent, blurred — the floating nav bar
  glass: 'from-raised-from/92 to-surface-to/88 backdrop-blur-nav',
};

const sizes: Record<CardSize, string> = {
  sm: 'rounded-md p-4',
  md: 'rounded-xl p-6',
  bar: 'h-13 rounded-lg px-3.5 md:h-15.5 md:rounded-xl md:px-5',
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
