import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

/**
 * An anchor in one of the link treatments the design uses.
 *
 * The focus ring is not declared here — globals.css applies it to every
 * :focus-visible element, so it can never be forgotten on one variant.
 */
export type LinkVariant = 'default' | 'nav' | 'underline' | 'quiet';

const VARIANT: Record<LinkVariant, string> = {
  default: 'text-accent-ink hover:text-accent no-underline',
  nav: [
    'inline-block min-h-control-sm px-2 py-6 no-underline',
    'font-sans text-nav font-medium leading-tight',
    'text-text-muted hover:text-text',
    'border-b-emphasis border-transparent hover:border-accent',
  ].join(' '),
  underline: [
    'inline-flex items-center min-h-tap no-underline',
    'font-sans text-body-sm font-medium leading-tight',
    'text-text hover:text-accent-ink',
    'border-b-emphasis border-accent',
  ].join(' '),
  quiet: 'text-text hover:text-accent-ink no-underline',
};

export interface LinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> {
  href: string;
  variant?: LinkVariant;
  /** Marks the current item in a set, e.g. the active nav entry. */
  current?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Link({
  href,
  variant = 'default',
  current,
  className,
  children,
  ...rest
}: LinkProps) {
  const external = /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      aria-current={current ? 'true' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={cn(
        VARIANT[variant],
        current && variant === 'nav' && 'text-text border-accent',
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  );
}
