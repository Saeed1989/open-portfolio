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
 * The section descriptors — the single source of truth. Key order here is the
 * default section order, and the order of each `fields` / `itemFields` array
 * is the public render order: section components iterate those arrays.
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

/** An enabled section whose content satisfies this is omitted from the page entirely. */
export function isSectionEmpty(type: SectionType, content: unknown): boolean {
  return REGISTRY[type].emptyCondition(content);
}
