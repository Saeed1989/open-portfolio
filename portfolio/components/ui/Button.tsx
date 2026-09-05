import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

/**
 * The design's two call-to-action treatments. Renders an <a> when `href` is
 * supplied — the hero CTAs are links that look like buttons — and a <button>
 * otherwise, so the element always matches what it actually does.
 */
export type ButtonVariant = 'primary' | 'secondary';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-8 no-underline rounded-sm font-sans font-medium leading-none cursor-pointer';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-on border border-accent hover:bg-accent-ink hover:border-accent-ink',
  secondary: 'bg-surface text-text border border-border hover:border-text',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'min-h-control px-14 text-compact',
  md: 'min-h-tap-lg px-24 text-body',
};

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className'
>;

export interface ButtonProps extends NativeButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders an anchor instead of a button. */
  href?: string;
  /** Anchor-only: prompts a download rather than a navigation. */
  download?: boolean | string;
  className?: string;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  href,
  download,
  className,
  children,
  type,
  ...rest
}: ButtonProps) {
  const classes = cn(BASE, VARIANT[variant], SIZE[size], className);

  if (href) {
    const external = /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        download={download}
        rel={external ? 'noopener noreferrer' : undefined}
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <button type={type ?? 'button'} className={classes} {...rest}>
      {children}
    </button>
  );
}
