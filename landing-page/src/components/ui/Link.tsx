import type { ReactNode } from 'react';

export type LinkVariant = 'inline' | 'nav' | 'subtle';

const variants: Record<LinkVariant, string> = {
  inline: 'text-accent-ink underline-offset-4 hover:text-accent-ink-strong hover:underline',
  nav: 'py-2 text-body-sm text-text-muted hover:text-text',
  subtle: 'text-caption text-text-muted hover:text-text',
};

interface LinkProps {
  href: string;
  variant?: LinkVariant;
  mono?: boolean;
  /** Layout classes only. */
  className?: string;
  children: ReactNode;
}

export function Link({ href, variant = 'inline', mono = false, className, children }: LinkProps) {
  const classes = [
    'rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink-strong',
    variants[variant],
    mono && 'font-mono',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <a href={href} className={classes}>
      {children}
    </a>
  );
}
