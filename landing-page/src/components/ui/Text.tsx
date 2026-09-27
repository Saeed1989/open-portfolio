import type { ReactNode } from 'react';

export type TextSize =
  | 'heading'
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
  | 'danger'
  | 'light'
  | 'light-muted';

const sizes: Record<TextSize, string> = {
  heading: 'text-heading-sm md:text-heading',
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
  // for content inside a light BrowserFrame
  light: 'text-light-text',
  'light-muted': 'text-light-text-muted',
};

const weights = {
  regular: '',
  medium: 'font-medium',
  semibold: 'font-semibold',
};

interface TextProps {
  as?: 'p' | 'span' | 'div' | 'dt' | 'dd' | 'li';
  size?: TextSize;
  /** Defaults to `label` for eyebrows, `default` otherwise. */
  tone?: TextTone;
  mono?: boolean;
  weight?: keyof typeof weights;
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
    weights[weight],
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
