import type { MouseEvent, ReactNode } from 'react';
import { cn } from './cn';

/**
 * A raised surface.
 *
 * The design has no box-shadow anywhere — separation is a 1px border against
 * --surface — so this primitive carries no elevation prop. The two paddings
 * and radii below are the project card and the skill card respectively.
 *
 * A project card is itself the control that opens its case study, so `as` also
 * covers `button`. That is one element, not a button nested in a card: making
 * the whole surface the control is what the design asks for, and it keeps the
 * card free of the nested interactive content that a link inside a button
 * would produce.
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

/* Reset of the button's inherited chrome, then the design's hover: the border
   takes the accent and the card lifts 2px. Both are transitioned, and both are
   dropped for a visitor who has asked for less motion. */
const INTERACTIVE = [
  'cursor-pointer appearance-none text-left font-sans text-inherit',
  'transition-[border-color,transform] duration-150',
  'hover:border-accent hover:-translate-y-2',
  'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
].join(' ');

export interface CardProps {
  /** Element to render — <li> inside a list, <article> when standalone. */
  as?: 'div' | 'li' | 'article' | 'section' | 'button';
  padding?: CardPadding;
  radius?: CardRadius;
  /** Draws the hover treatment. Implied by `as="button"`. */
  interactive?: boolean;
  /** Button only. */
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  /** Button only: names the kind of thing the control opens. */
  'aria-haspopup'?: 'dialog' | 'menu' | 'true';
  className?: string;
  children?: ReactNode;
}

export function Card({
  as: Component = 'div',
  padding = 'roomy',
  radius = 'lg',
  interactive,
  onClick,
  'aria-haspopup': ariaHasPopup,
  className,
  children,
}: CardProps) {
  const isButton = Component === 'button';

  return (
    <Component
      type={isButton ? 'button' : undefined}
      onClick={onClick}
      aria-haspopup={ariaHasPopup}
      className={cn(
        'min-w-0 bg-surface border border-border shadow-none',
        PADDING[padding],
        RADIUS[radius],
        (interactive ?? isButton) && INTERACTIVE,
        className,
      )}
    >
      {children}
    </Component>
  );
}
