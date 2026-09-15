import type { ReactNode } from 'react';

export type BadgeVariant = 'pill' | 'tag' | 'chip' | 'step' | 'mark' | 'swatch' | 'cta';

const variants: Record<BadgeVariant, string> = {
  // hero eyebrow pill
  pill:
    'gap-2 rounded-full px-3 py-1.5 font-mono text-eyebrow font-medium uppercase tracking-eyebrow text-accent-ink-strong ' +
    'bg-linear-135 from-accent-from/14 to-accent-to/10 inset-shadow-highlight-strong ring-1 ring-accent-ink-strong/22',
  // small status label, e.g. "preset"
  tag:
    'rounded-xs px-1.5 py-0.5 font-mono text-micro font-medium uppercase tracking-eyebrow text-accent-ink-strong ' +
    'bg-accent-from/10 ring-1 ring-accent-ink-strong/28',
  // neutral token, e.g. a skill
  chip:
    'rounded-xs px-2 py-1 font-mono text-eyebrow text-text ' +
    'bg-linear-135 from-surface-from to-surface-to inset-shadow-highlight ring-1 ring-border-subtle',
  // numbered step tile on the accent fill
  step:
    'size-6 justify-center rounded-sm font-mono text-small font-medium text-on-accent ' +
    'bg-linear-135 from-accent-from to-accent-to inset-shadow-highlight-accent shadow-glow-pressed',
  // monogram tile, e.g. an integration
  mark:
    'size-8 justify-center rounded-md font-mono text-caption font-medium text-text ' +
    'bg-linear-135 from-raised-from to-raised-to inset-shadow-highlight ring-1 ring-border-subtle',
  // decorative accent square, e.g. a legend key
  swatch:
    'size-3 rounded-xs bg-linear-135 from-accent-from to-accent-to inset-shadow-highlight-accent',
  // non-interactive button look, for illustrations only
  cta:
    'rounded-sm px-3 py-1.5 text-small font-medium text-on-accent ' +
    'bg-linear-135 from-accent-from to-accent-to inset-shadow-highlight-accent',
};

interface BadgeProps {
  variant: BadgeVariant;
  /** Leading accent dot; used by the pill. */
  dot?: boolean;
  /** Layout classes only. */
  className?: string;
  children?: ReactNode;
}

export function Badge({ variant, dot = false, className, children }: BadgeProps) {
  const classes = ['inline-flex shrink-0 items-center', variants[variant], className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} aria-hidden={variant === 'swatch' ? true : undefined}>
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-from" />}
      {children}
    </span>
  );
}
