import type { ElementType, ReactNode } from 'react';
import { cn } from './cn';

/**
 * The typographic scale of the design, as six named roles.
 *
 * Every class below resolves to a token in globals.css — there is no literal
 * size, weight or colour here, so a runtime theme change is picked up without
 * a rebuild.
 */
export type TextVariant =
  | 'display'
  | 'heading'
  | 'subheading'
  | 'tagline'
  | 'lead'
  | 'body'
  | 'detail'
  | 'caption'
  | 'eyebrow'
  | 'label'
  | 'meta'
  | 'skill'
  | 'fine'
  | 'mono';

export type TextTone = 'default' | 'muted' | 'accent' | 'on-accent';

const VARIANT: Record<TextVariant, string> = {
  display:
    'font-display text-display font-semibold leading-display tracking-display',
  heading:
    'font-display text-heading font-semibold leading-heading tracking-heading',
  subheading:
    'font-display text-subheading font-semibold leading-heading tracking-heading',
  /* Hero: the promise under the name. */
  tagline:
    'font-display text-tagline font-medium leading-tagline tracking-tagline',
  /* Hero: the bio paragraph, at the design's only fluid body size. */
  lead: 'font-sans text-body-fluid font-regular leading-body',
  body: 'font-sans text-body font-regular leading-loose',
  /* A skill name in the detailed tier. */
  detail: 'font-sans text-body-sm font-regular leading-tight',
  caption: 'font-sans text-nav font-regular leading-tight',
  /* Hero: the uppercase line above the name. */
  eyebrow:
    'font-display text-meta font-medium leading-none tracking-eyebrow uppercase',
  /* The uppercase label on a contact row — same size, tighter tracking. */
  label:
    'font-display text-meta font-medium leading-none tracking-wide uppercase',
  /* A year, a date, or a rating in the detailed tier. */
  meta: 'font-display text-meta font-regular leading-tight tracking-meta',
  /* A skill name in the prominent tier. */
  skill: 'font-display text-skill font-medium leading-snug',
  /* A rating in the prominent tier. */
  fine: 'font-display text-fine font-medium leading-snug',
  mono: 'font-mono text-compact font-regular leading-normal',
};

const TONE: Record<TextTone, string> = {
  default: 'text-text',
  muted: 'text-text-muted',
  accent: 'text-accent-ink',
  'on-accent': 'text-accent-on',
};

export interface TextProps {
  /** Element to render. Defaults to <p> for block variants, <span> otherwise. */
  as?: ElementType;
  variant?: TextVariant;
  tone?: TextTone;
  /** Constrains the measure. The design caps body copy at a readable width. */
  balance?: boolean;
  id?: string;
  className?: string;
  children?: ReactNode;
}

const DEFAULT_ELEMENT: Record<TextVariant, ElementType> = {
  display: 'p',
  heading: 'p',
  subheading: 'p',
  tagline: 'p',
  lead: 'p',
  body: 'p',
  detail: 'span',
  caption: 'span',
  eyebrow: 'p',
  label: 'span',
  meta: 'span',
  skill: 'span',
  fine: 'span',
  mono: 'span',
};

export function Text({
  as,
  variant = 'body',
  tone = 'default',
  balance = false,
  id,
  className,
  children,
}: TextProps) {
  const Component = as ?? DEFAULT_ELEMENT[variant];
  return (
    <Component
      id={id}
      className={cn(
        VARIANT[variant],
        TONE[tone],
        balance && 'text-pretty',
        'break-words',
        className,
      )}
    >
      {children}
    </Component>
  );
}
