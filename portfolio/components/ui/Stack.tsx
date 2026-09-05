import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * A flex layout wrapper.
 *
 * The design is built almost entirely from wrapping flex rows and columns with
 * a token gap. Without this primitive every section would reach for a raw
 * `<div className="flex ...">`, which is exactly the drift the component-library
 * rules exist to prevent. Stack carries no colour and no typography — it only
 * decides direction, gap, wrapping and alignment.
 *
 * `as` covers the semantic elements the design actually uses; a list renders
 * with its bullets and default padding already removed.
 */
export type StackElement =
  | 'div'
  | 'ul'
  | 'ol'
  | 'li'
  | 'nav'
  | 'header'
  | 'footer'
  | 'article'
  | 'figure'
  | 'span';

/** Spacing tokens usable as a gap. Every one resolves to a `--space-*`. */
export type SpaceToken =
  | '0'
  | '2'
  | '4'
  | '5'
  | '6'
  | '8'
  | '10'
  | '12'
  | '14'
  | '16'
  | '18'
  | '20'
  | '22'
  | '24'
  | '28'
  | '32'
  | '40'
  | '48'
  | 'grid-gap'
  | 'skill-gap'
  | 'group-gap'
  | 'contact-gap'
  | 'hero-gap'
  | 'stack-sm'
  | 'stack-md'
  | 'stack-lg'
  | 'block-gap';

/*
 * Written out in full rather than interpolated: Tailwind scans source for
 * complete class names, and a template literal would compile to nothing.
 */
const GAP: Record<SpaceToken, string> = {
  '0': 'gap-0',
  '2': 'gap-2',
  '4': 'gap-4',
  '5': 'gap-5',
  '6': 'gap-6',
  '8': 'gap-8',
  '10': 'gap-10',
  '12': 'gap-12',
  '14': 'gap-14',
  '16': 'gap-16',
  '18': 'gap-18',
  '20': 'gap-20',
  '22': 'gap-22',
  '24': 'gap-24',
  '28': 'gap-28',
  '32': 'gap-32',
  '40': 'gap-40',
  '48': 'gap-48',
  'grid-gap': 'gap-grid-gap',
  'skill-gap': 'gap-skill-gap',
  'group-gap': 'gap-group-gap',
  'contact-gap': 'gap-contact-gap',
  'hero-gap': 'gap-hero-gap',
  'stack-sm': 'gap-stack-sm',
  'stack-md': 'gap-stack-md',
  'stack-lg': 'gap-stack-lg',
  'block-gap': 'gap-block-gap',
};

const GAP_X: Record<SpaceToken, string> = {
  '0': 'gap-x-0',
  '2': 'gap-x-2',
  '4': 'gap-x-4',
  '5': 'gap-x-5',
  '6': 'gap-x-6',
  '8': 'gap-x-8',
  '10': 'gap-x-10',
  '12': 'gap-x-12',
  '14': 'gap-x-14',
  '16': 'gap-x-16',
  '18': 'gap-x-18',
  '20': 'gap-x-20',
  '22': 'gap-x-22',
  '24': 'gap-x-24',
  '28': 'gap-x-28',
  '32': 'gap-x-32',
  '40': 'gap-x-40',
  '48': 'gap-x-48',
  'grid-gap': 'gap-x-grid-gap',
  'skill-gap': 'gap-x-skill-gap',
  'group-gap': 'gap-x-group-gap',
  'contact-gap': 'gap-x-contact-gap',
  'hero-gap': 'gap-x-hero-gap',
  'stack-sm': 'gap-x-stack-sm',
  'stack-md': 'gap-x-stack-md',
  'stack-lg': 'gap-x-stack-lg',
  'block-gap': 'gap-x-block-gap',
};

const GAP_Y: Record<SpaceToken, string> = {
  '0': 'gap-y-0',
  '2': 'gap-y-2',
  '4': 'gap-y-4',
  '5': 'gap-y-5',
  '6': 'gap-y-6',
  '8': 'gap-y-8',
  '10': 'gap-y-10',
  '12': 'gap-y-12',
  '14': 'gap-y-14',
  '16': 'gap-y-16',
  '18': 'gap-y-18',
  '20': 'gap-y-20',
  '22': 'gap-y-22',
  '24': 'gap-y-24',
  '28': 'gap-y-28',
  '32': 'gap-y-32',
  '40': 'gap-y-40',
  '48': 'gap-y-48',
  'grid-gap': 'gap-y-grid-gap',
  'skill-gap': 'gap-y-skill-gap',
  'group-gap': 'gap-y-group-gap',
  'contact-gap': 'gap-y-contact-gap',
  'hero-gap': 'gap-y-hero-gap',
  'stack-sm': 'gap-y-stack-sm',
  'stack-md': 'gap-y-stack-md',
  'stack-lg': 'gap-y-stack-lg',
  'block-gap': 'gap-y-block-gap',
};

export type StackAlign = 'start' | 'center' | 'baseline' | 'end' | 'stretch';
export type StackJustify = 'start' | 'center' | 'between' | 'end';

const ALIGN: Record<StackAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  baseline: 'items-baseline',
  end: 'items-end',
  stretch: 'items-stretch',
};

const JUSTIFY: Record<StackJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  between: 'justify-between',
  end: 'justify-end',
};

export interface StackProps {
  as?: StackElement;
  direction?: 'row' | 'column';
  /** Gap on both axes. Ignored where `gapX` / `gapY` are given. */
  gap?: SpaceToken;
  gapX?: SpaceToken;
  gapY?: SpaceToken;
  wrap?: boolean;
  align?: StackAlign;
  justify?: StackJustify;
  /** Announced name when the stack is a labelled list or landmark. */
  label?: string;
  id?: string;
  className?: string;
  children?: ReactNode;
}

export function Stack({
  as: Component = 'div',
  direction = 'column',
  gap,
  gapX,
  gapY,
  wrap = false,
  align,
  justify,
  label,
  id,
  className,
  children,
}: StackProps) {
  const isList = Component === 'ul' || Component === 'ol';

  return (
    <Component
      id={id}
      aria-label={label}
      className={cn(
        'flex min-w-0',
        direction === 'row' ? 'flex-row' : 'flex-col',
        wrap && 'flex-wrap',
        isList && 'm-0 p-0 list-none',
        gap && GAP[gap],
        gapX && GAP_X[gapX],
        gapY && GAP_Y[gapY],
        align && ALIGN[align],
        justify && JUSTIFY[justify],
        className,
      )}
    >
      {children}
    </Component>
  );
}
