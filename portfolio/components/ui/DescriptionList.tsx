import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * A labelled field list — `<dl>` with `<dt>`/`<dd>` pairs.
 *
 * The design uses this shape wherever content is "label, then value": the
 * Problem / Impact / Stack block inside a project card, and again inside the
 * Solution / My role disclosure. It is a real description list rather than
 * styled divs so a screen reader announces each value with its label.
 *
 * `stack` puts the label above the value (the project card). `inline` sets
 * them on one baseline, spread apart — the treatment the design uses for
 * label/value rows.
 */
export type DescriptionListLayout = 'stack' | 'inline';

export interface DescriptionListProps {
  layout?: DescriptionListLayout;
  className?: string;
  children?: ReactNode;
}

const LIST_LAYOUT: Record<DescriptionListLayout, string> = {
  stack: 'gap-10',
  inline: 'gap-8',
};

export function DescriptionList({
  layout = 'stack',
  className,
  children,
}: DescriptionListProps) {
  return (
    <dl className={cn('m-0 flex min-w-0 flex-col', LIST_LAYOUT[layout], className)}>
      {children}
    </dl>
  );
}

/**
 * `prose` is sentence copy. `technical` is the design's stack line — the same
 * size in the display face, for a dot-separated list of technologies.
 */
export type DescriptionValueStyle = 'prose' | 'technical';

const VALUE: Record<DescriptionValueStyle, string> = {
  prose: 'font-sans text-body-sm leading-relaxed',
  technical: 'font-display text-compact leading-normal',
};

export interface DescriptionListItemProps {
  label: string;
  layout?: DescriptionListLayout;
  valueStyle?: DescriptionValueStyle;
  /** The design drops the disclosure's copy to the muted tone. */
  tone?: 'default' | 'muted';
  /**
   * Renders the value at medium weight. The design leans on this to make a
   * project's Impact read heavier than its Problem.
   */
  emphasis?: boolean;
  className?: string;
  children?: ReactNode;
}

const TERM =
  'font-display text-eyebrow font-medium leading-none tracking-wider uppercase text-text-muted';

export function DescriptionListItem({
  label,
  layout = 'stack',
  valueStyle = 'prose',
  tone = 'default',
  emphasis = false,
  className,
  children,
}: DescriptionListItemProps) {
  if (layout === 'inline') {
    return (
      <div
        className={cn(
          'flex min-w-0 flex-wrap items-baseline justify-between gap-x-16 gap-y-2',
          className,
        )}
      >
        <dt className={TERM}>{label}</dt>
        <dd
          className={cn(
            'm-0 min-w-0 break-words',
            VALUE[valueStyle],
            tone === 'muted' ? 'text-text-muted' : 'text-text',
            emphasis ? 'font-medium' : 'font-regular',
          )}
        >
          {children}
        </dd>
      </div>
    );
  }

  return (
    <div className={cn('min-w-0', className)}>
      <dt className={cn(TERM, 'mb-4')}>{label}</dt>
      <dd
        className={cn(
          'm-0 min-w-0 break-words text-pretty',
          VALUE[valueStyle],
          tone === 'muted' ? 'text-text-muted' : 'text-text',
          emphasis ? 'font-medium' : 'font-regular',
        )}
      >
        {children}
      </dd>
    </div>
  );
}
