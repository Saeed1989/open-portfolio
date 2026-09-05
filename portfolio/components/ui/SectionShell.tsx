import type { ReactNode } from 'react';
import { cn } from './cn';
import { Heading } from './Heading';
import { PageSection } from './PageSection';
import { Text } from './Text';

/**
 * PageSection plus the heading that names it — the frame every titled section
 * on the public page shares.
 *
 * The section labels itself with aria-labelledby against the heading's id, so
 * landmark navigation announces a real name.
 *
 * Deciding whether a section renders at all is NOT this component's job —
 * that belongs to the caller, driven by the registry's emptyCondition
 * (FR-CFG-2). If SectionShell is rendered, it draws its heading.
 */
const MEASURE = {
  content: 'max-w-content',
  legend: 'max-w-legend',
  intro: 'max-w-intro',
} as const;

export interface SectionShellProps {
  /** Anchor target and the stem of the heading id. */
  id: string;
  heading: string;
  /** Optional lead-in below the heading. */
  description?: string;
  /** Rendered opposite the heading, e.g. a result count. */
  aside?: ReactNode;
  /** Measure the description is capped at. The design caps a legend at 52ch. */
  descriptionMeasure?: 'content' | 'legend' | 'intro';
  /** Draws the separating hairline above the section. */
  divided?: boolean;
  className?: string;
  children?: ReactNode;
}

export function SectionShell({
  id,
  heading,
  description,
  aside,
  descriptionMeasure = 'content',
  divided = true,
  className,
  children,
}: SectionShellProps) {
  const headingId = `${id}-heading`;

  return (
    <PageSection
      id={id}
      labelledBy={headingId}
      divided={divided}
      className={className}
    >
      <div
        className={cn(
          'flex flex-wrap items-baseline justify-between gap-x-24 gap-y-8',
          description ? 'mb-10' : 'mb-section-gap',
        )}
      >
        <Heading level={2} id={headingId}>
          {heading}
        </Heading>
        {aside}
      </div>

      {description ? (
        <Text
          variant="caption"
          tone="muted"
          as="p"
          balance
          className={cn(MEASURE[descriptionMeasure], 'mb-desc-gap leading-loose')}
        >
          {description}
        </Text>
      ) : null}

      {children}
    </PageSection>
  );
}
