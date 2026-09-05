import { Fragment } from 'react';
import {
  isSectionEmpty,
  SECTION_TYPES,
  type SectionInstance,
  type SectionType,
} from '@openportfolio/registry';

import type { PortfolioTheme } from '@/lib/theme';
import { sectionRegistry } from './registry';

/**
 * Turns an ordered section array into a page.
 *
 * Four rules, in order:
 *
 *  1. `enabled: false` is dropped (FR-CFG-1).
 *  2. A type the registry does not declare is dropped — a payload written
 *     against a newer registry than this build must not take the page down.
 *  3. Content satisfying the type's `emptyCondition` is dropped (FR-CFG-2).
 *  4. What survives renders in `order`.
 *
 * A dropped section leaves no trace. There is no wrapper element, no
 * placeholder, and no margin of its own: every section owns its block padding
 * and draws its own top hairline, so removing one cannot leave a doubled gap
 * or a stray rule behind. The output is a bare fragment for the same reason.
 *
 * A type with no component logs and renders nothing. It never throws — one
 * unmapped section must not cost the tenant their whole page.
 */
const KNOWN = new Set<string>(SECTION_TYPES);

function isKnownType(type: string): type is SectionType {
  return KNOWN.has(type);
}

export interface SectionRendererProps {
  sections: readonly SectionInstance[];
  /** Forwarded to every section; see SectionProps for why one needs it. */
  theme?: PortfolioTheme;
}

export function SectionRenderer({ sections, theme }: SectionRendererProps) {
  const visible = sections
    .filter((section) => section.enabled)
    .filter((section) => isKnownType(section.type))
    .filter((section) => !isSectionEmpty(section.type, section.content))
    .slice()
    .sort((a, b) => a.order - b.order);

  return (
    <>
      {visible.map((section) => {
        const Component = sectionRegistry[section.type];

        if (!Component) {
          console.warn(
            `[SectionRenderer] no component registered for section type "${section.type}" — skipping.`,
          );
          return null;
        }

        return (
          <Fragment key={`${section.type}-${section.order}`}>
            <Component content={section.content} theme={theme} />
          </Fragment>
        );
      })}
    </>
  );
}
