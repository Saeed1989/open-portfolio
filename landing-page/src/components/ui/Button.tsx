import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2.5 whitespace-nowrap select-none font-medium ' +
  'bg-linear-135 ring-1 cursor-pointer disabled:cursor-not-allowed ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink-strong ' +
  // lift on hover, sink on press — translate only, and only when motion is allowed
  'motion-safe:transition-transform motion-safe:duration-150 ' +
  'motion-safe:not-disabled:hover:-translate-y-0.5 motion-safe:not-disabled:active:translate-y-px';

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
    'hover:from-accent-from-hover hover:to-accent-to-hover hover:ring-accent-from/50 hover:shadow-glow-hover ' +
    'active:from-accent-from active:to-accent-to active:inset-shadow-pressed active:shadow-glow-pressed',
  secondary:
    'from-raised-from to-raised-to text-text inset-shadow-highlight ring-border shadow-control ' +
    'hover:from-raised-hover-from hover:to-raised-hover-to hover:ring-border-strong hover:inset-shadow-highlight-strong hover:shadow-control-hover ' +
    'active:from-raised-pressed-from active:to-raised-pressed-to active:inset-shadow-pressed active:shadow-none',
};

// `disabled:` sorts after `hover:` and `active:` in Tailwind's variant order,
// so a disabled button keeps this look under the pointer.
const disabled =
  'disabled:from-raised-from disabled:to-raised-to disabled:text-text-disabled disabled:ring-border-subtle ' +
  'disabled:inset-shadow-highlight disabled:shadow-none';

function buttonClasses(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return [base, sizes[size], variants[variant], disabled, className].filter(Boolean).join(' ');
}

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
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

interface ButtonLinkProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Layout classes only. */
  className?: string;
  children: ReactNode;
}

/** A link that navigates, styled as a button. */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: ButtonLinkProps) {
  return (
    <a href={href} className={buttonClasses(variant, size, className)}>
      {children}
    </a>
  );
}
