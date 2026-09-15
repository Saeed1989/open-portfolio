import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2.5 whitespace-nowrap select-none font-medium ' +
  'bg-linear-135 ring-1 cursor-pointer disabled:cursor-not-allowed ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink-strong';

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-md px-4 text-body-sm',
  md: 'h-13 rounded-lg px-7 text-body',
  lg: 'h-14 rounded-lg px-7 text-body-lg',
};

// Pressed keeps the rest fill rather than darkening it: the design's darker
// pressed fill drops the label below AA (3.19:1).
const variants: Record<ButtonVariant, string> = {
  primary:
    'from-accent-from to-accent-to text-on-accent inset-shadow-highlight-accent ring-accent-from/35 shadow-glow ' +
    'enabled:hover:from-accent-from-hover enabled:hover:to-accent-to-hover enabled:hover:ring-accent-from/50 enabled:hover:shadow-glow-hover ' +
    'enabled:active:from-accent-from enabled:active:to-accent-to enabled:active:inset-shadow-pressed enabled:active:shadow-glow-pressed',
  secondary:
    'from-raised-from to-raised-to text-text inset-shadow-highlight ring-border shadow-control ' +
    'enabled:hover:from-raised-hover-from enabled:hover:to-raised-hover-to enabled:hover:ring-border-strong enabled:hover:inset-shadow-highlight-strong enabled:hover:shadow-control-hover ' +
    'enabled:active:from-raised-pressed-from enabled:active:to-raised-pressed-to enabled:active:inset-shadow-pressed enabled:active:shadow-none',
};

const disabled =
  'disabled:from-raised-from disabled:to-raised-to disabled:text-text-disabled disabled:ring-border-subtle ' +
  'disabled:inset-shadow-highlight disabled:shadow-none';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Layout classes only. */
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [base, sizes[size], variants[variant], disabled, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
