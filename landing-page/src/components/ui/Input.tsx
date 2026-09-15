import type { InputHTMLAttributes, ReactNode } from 'react';

export type InputTone = 'default' | 'accent' | 'success' | 'danger';
export type InputSize = 'md' | 'lg';

const tones: Record<InputTone, string> = {
  default: 'ring-border shadow-control',
  accent: 'ring-accent-from/55 shadow-field-accent',
  success: 'ring-success/55 shadow-field-success',
  danger: 'ring-danger/55 shadow-field-danger',
};

const sizes: Record<InputSize, string> = {
  md: 'h-13 text-body',
  lg: 'h-14 text-body-lg',
};

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'className'> {
  tone?: InputTone;
  size?: InputSize;
  mono?: boolean;
  /** Fixed text rendered inside the field after the value. */
  suffix?: ReactNode;
  /** Status slot at the trailing edge, e.g. an icon. */
  trailing?: ReactNode;
  /** Layout classes for the field wrapper only. */
  className?: string;
}

export function Input({
  tone = 'default',
  size = 'lg',
  mono = false,
  suffix,
  trailing,
  className,
  ...rest
}: InputProps) {
  const field = [
    'flex items-center gap-2.5 rounded-lg px-4 bg-linear-135 from-surface-from to-surface-to inset-shadow-highlight ring-1',
    'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent-ink-strong',
    sizes[size],
    tones[tone],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const input = [
    'min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text-label disabled:text-text-disabled',
    mono && 'font-mono font-medium',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={field}>
      <input className={input} {...rest} />
      {suffix !== undefined && (
        <span className="whitespace-nowrap font-mono text-text-label">{suffix}</span>
      )}
      {trailing}
    </div>
  );
}
