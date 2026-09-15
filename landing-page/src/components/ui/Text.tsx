import type { ReactNode } from 'react';

export type TextSize =
  | 'lead'
  | 'body-lg'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'small'
  | 'micro'
  | 'eyebrow';

export type TextTone =
  | 'default'
  | 'muted'
  | 'subtle'
  | 'label'
  | 'accent'
  | 'accent-strong'
  | 'success'
  | 'danger';

const sizes: Record<TextSize, string> = {
  lead: 'text-lead',
  'body-lg': 'text-body-lg',
  body: 'text-body',
  'body-sm': 'text-body-sm',
  caption: 'text-caption',
  small: 'text-small',
  micro: 'text-micro',
  eyebrow: 'font-mono text-eyebrow font-medium uppercase tracking-eyebrow',
};

const tones: Record<TextTone, string> = {
  default: 'text-text',
  muted: 'text-text-muted',
  subtle: 'text-text-subtle',
  label: 'text-text-label',
  accent: 'text-accent-ink',
  'accent-strong': 'text-accent-ink-strong',
  success: 'text-success',
  danger: 'text-danger',
};

interface TextProps {
  as?: 'p' | 'span' | 'div' | 'dt' | 'dd' | 'li';
  size?: TextSize;
  /** Defaults to `label` for eyebrows, `default` otherwise. */
  tone?: TextTone;
  mono?: boolean;
  weight?: 'regular' | 'medium';
  id?: string;
  /** Layout classes only — colour and typography come from the props above. */
  className?: string;
  children: ReactNode;
}

export function Text({
  as: Tag = 'p',
  size = 'body',
  tone,
  mono = false,
  weight = 'regular',
  id,
  className,
  children,
}: TextProps) {
  const classes = [
    sizes[size],
    tones[tone ?? (size === 'eyebrow' ? 'label' : 'default')],
    mono && 'font-mono',
    weight === 'medium' && 'font-medium',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag id={id} className={classes}>
      {children}
    </Tag>
  );
}
