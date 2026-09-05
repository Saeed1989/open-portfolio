import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * The small uppercase label the design uses for a project's category and for
 * the field labels inside a card. Static — never interactive.
 */
export type BadgeVariant = 'accent' | 'muted';
export type BadgeShape = 'pill' | 'bare';

const BASE =
  'inline-flex items-center font-display text-chip font-medium leading-none tracking-wide uppercase';

const VARIANT: Record<BadgeVariant, string> = {
  accent: 'text-accent-ink',
  muted: 'text-text-muted',
};

const SHAPE: Record<BadgeShape, string> = {
  pill: 'border border-border rounded-pill px-9 py-5',
  bare: '',
};

export interface BadgeProps {
  variant?: BadgeVariant;
  shape?: BadgeShape;
  className?: string;
  children?: ReactNode;
}

export function Badge({
  variant = 'accent',
  shape = 'pill',
  className,
  children,
}: BadgeProps) {
  return (
    <span className={cn(BASE, VARIANT[variant], SHAPE[shape], className)}>
      {children}
    </span>
  );
}
