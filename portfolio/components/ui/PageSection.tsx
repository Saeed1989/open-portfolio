import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * The bare section frame: the content measure, the fluid gutters, the block
 * padding, and the hairline that separates one section from the next.
 *
 * SectionShell is this plus a heading. Hero needs the frame without one — in
 * the design it labels itself with its own `<h1>` and carries neither a rule
 * above it nor the standard block padding — so the frame is factored out here
 * rather than bolted onto SectionShell as a pile of opt-outs.
 *
 * Whether a section renders at all is the caller's decision, driven by the
 * registry's emptyCondition (FR-CFG-2). This component has no empty state.
 */
export type PageSectionPadding = 'section' | 'hero';

const PADDING: Record<PageSectionPadding, string> = {
  section: 'py-section-y',
  hero: 'pt-hero-top pb-hero-bottom',
};

export interface PageSectionProps {
  /** Anchor target. */
  id?: string;
  /** Id of the heading that names this landmark. */
  labelledBy?: string;
  padding?: PageSectionPadding;
  /** Draws the separating hairline above the section. */
  divided?: boolean;
  className?: string;
  children?: ReactNode;
}

export function PageSection({
  id,
  labelledBy,
  padding = 'section',
  divided = true,
  className,
  children,
}: PageSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        'mx-auto w-full max-w-content px-gutter',
        PADDING[padding],
        divided && 'border-t border-border',
        className,
      )}
    >
      {children}
    </section>
  );
}
