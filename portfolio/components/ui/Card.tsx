import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * A raised surface.
 *
 * The design has no box-shadow anywhere — separation is a 1px border against
 * --surface — so this primitive carries no elevation prop. The two paddings
 * and radii below are the project card and the skill card respectively.
 */
export type CardPadding = 'roomy' | 'snug' | 'none';
export type CardRadius = 'lg' | 'md' | 'sm';

const PADDING: Record<CardPadding, string> = {
  roomy: 'p-card-pad',
  snug: 'px-18 pt-16 pb-18',
  none: '',
};

const RADIUS: Record<CardRadius, string> = {
  lg: 'rounded-lg',
  md: 'rounded-md',
  sm: 'rounded-sm',
};

export interface CardProps {
  /** Element to render — <li> inside a list, <article> when standalone. */
  as?: 'div' | 'li' | 'article' | 'section';
  padding?: CardPadding;
  radius?: CardRadius;
  className?: string;
  children?: ReactNode;
}

export function Card({
  as: Component = 'div',
  padding = 'roomy',
  radius = 'lg',
  className,
  children,
}: CardProps) {
  return (
    <Component
      className={cn(
        'min-w-0 bg-surface border border-border shadow-none',
        PADDING[padding],
        RADIUS[radius],
        className,
      )}
    >
      {children}
    </Component>
  );
}
