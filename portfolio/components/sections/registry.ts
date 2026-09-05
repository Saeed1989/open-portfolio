import type { ComponentType } from 'react';
import type { SectionType } from '@openportfolio/registry';
import type { PortfolioTheme } from '@/lib/theme';

import { Achievements } from './Achievements';
import { Blog } from './Blog';
import { Contact } from './Contact';
import { Education } from './Education';
import { Experience } from './Experience';
import { Gallery } from './Gallery';
import { Hero } from './Hero';
import { OpenSource } from './OpenSource';
import { Projects } from './Projects';
import { Skills } from './Skills';
import { Speaking } from './Speaking';
import { Testimonials } from './Testimonials';

/**
 * The dispatch table: one section type, one component (FR-REG-3).
 *
 * Adding a section type is a registry entry in `@openportfolio/registry` plus
 * a component here. Nothing else in this app changes — SectionRenderer walks
 * whatever the payload contains and looks each type up in this map.
 */
export interface SectionProps {
  content: unknown;
  /**
   * The resolved theme, passed to every section and used by almost none.
   *
   * The open-source section needs it: its GitHub stat cards are third-party
   * images whose title and icon colours are query parameters, so the accent
   * has to be a value at render time rather than a custom property the
   * browser resolves later. Reading it from CSS on the client instead would
   * mean a second request after mount and a visible swap.
   */
  theme?: PortfolioTheme;
}

export type SectionComponent = ComponentType<SectionProps>;

/**
 * Each section states the content type it actually accepts. The map erases
 * that to `unknown`, because a section instance arriving from the API is
 * untyped until its `type` is read. The API validates content against the same
 * registry before it is published (FR-PUB-6), and a section whose content is
 * malformed enough to matter is caught by its emptyCondition and never
 * rendered at all.
 */
function entry<T>(
  component: ComponentType<{ content: T; theme?: PortfolioTheme }>,
): SectionComponent {
  return component as SectionComponent;
}

export const sectionRegistry: Record<SectionType, SectionComponent> = {
  hero: entry(Hero),
  projects: entry(Projects),
  skills: entry(Skills),
  contact: entry(Contact),
  experience: entry(Experience),
  education: entry(Education),
  blog: entry(Blog),
  testimonials: entry(Testimonials),
  opensource: entry(OpenSource),
  speaking: entry(Speaking),
  achievements: entry(Achievements),
  gallery: entry(Gallery),
};
