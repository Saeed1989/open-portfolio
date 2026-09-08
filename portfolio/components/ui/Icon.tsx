import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * An SVG wrapper.
 *
 * NOTE: spec/uiDesign/portfolio.html contains no iconography at all — no SVG, no icon
 * font, no glyphs. This primitive therefore establishes sizing, colour
 * inheritance and accessibility handling, but its visual language is not
 * derived from the approved design and should be reviewed before first use.
 *
 * The caller supplies the path data as children. Icons inherit `currentColor`,
 * so they take the colour of whatever text they sit beside.
 */
export type IconSize = 'sm' | 'md' | 'lg';

const SIZE: Record<IconSize, string> = {
  sm: 'w-icon-sm h-icon-sm',
  md: 'w-icon h-icon',
  lg: 'w-icon-lg h-icon-lg',
};

export interface IconProps {
  /**
   * Accessible name. Omit for an icon that merely decorates adjacent text —
   * it is then hidden from assistive technology.
   */
  label?: string;
  size?: IconSize;
  /** SVG user-space coordinates the children are drawn in. */
  viewBox?: string;
  className?: string;
  children: ReactNode;
}

export function Icon({
  label,
  size = 'md',
  viewBox = '0 0 24 24',
  className,
  children,
}: IconProps) {
  return (
    <svg
      viewBox={viewBox}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', SIZE[size], className)}
    >
      {children}
    </svg>
  );
}
