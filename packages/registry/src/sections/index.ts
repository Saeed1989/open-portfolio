import type { SectionDescriptor, SectionType } from '../types';
import { hero } from './hero';
import { projects } from './projects';
import { skills } from './skills';
import { contact } from './contact';
import { experience } from './experience';
import { education } from './education';
import { blog } from './blog';
import { testimonials } from './testimonials';
import { opensource } from './opensource';
import { speaking } from './speaking';
import { achievements } from './achievements';
import { trainings } from './trainings';
import { gallery } from './gallery';

/**
 * The thirteen section descriptors — the single source of truth (FR-REG-1).
 *
 * One file per section type, assembled here. The order of the keys below is
 * the registry order, and so the default section order (SRS §4.1).
 *
 * The order of each `fields` / `itemFields` array is the public render order
 * (FR-REG-2). It is not a hint: section components iterate these arrays and
 * look up a renderer per key, so no component can drift from the declared
 * order, and every item in a collection is laid out identically by
 * construction.
 *
 * Where the approved design (spec/uiDesign/portfolio.html) fixes an order, the array
 * below matches it — the design's project card reads screenshot, category,
 * year, title, then Problem, Impact and Stack.
 *
 * `projects` carries two runs of fields rather than one: the card-level run
 * ending at `role`, and the `body` run behind it, which is the case-study
 * modal (FR-SEC-PROJ-6). Both are walked from this one array.
 */
export const REGISTRY = {
  hero,
  projects,
  skills,
  contact,
  experience,
  education,
  blog,
  testimonials,
  opensource,
  speaking,
  achievements,
  trainings,
  gallery,
} as const satisfies Record<SectionType, SectionDescriptor>;

export type Registry = typeof REGISTRY;

export function getDescriptor(type: SectionType): SectionDescriptor {
  return REGISTRY[type];
}

/**
 * FR-CFG-2. An enabled section whose content satisfies this is omitted from
 * the page entirely — no heading, no wrapper, no empty state.
 */
export function isSectionEmpty(type: SectionType, content: unknown): boolean {
  return REGISTRY[type].emptyCondition(content);
}
