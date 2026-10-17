/** The section registry's vocabulary. Framework-free: it imports only its sibling field types. */

import type { FieldDescriptor } from './fields';

/** The thirteen declared section types. */
export const SECTION_TYPES = [
  'hero',
  'projects',
  'skills',
  'contact',
  'experience',
  'education',
  'blog',
  'testimonials',
  'opensource',
  'speaking',
  'achievements',
  /* Registry order is the default section order. */
  'trainings',
  'gallery',
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export type Priority = 'must' | 'should' | 'could';

interface DescriptorBase {
  readonly type: SectionType;
  readonly label: string;
  readonly description: string;
  readonly priority: Priority;
  /** True when the section is empty and must be omitted from the page entirely. */
  readonly emptyCondition: (content: unknown) => boolean;
}

export interface SingleSectionDescriptor extends DescriptorBase {
  readonly cardinality: 'single';
  /** Render order of the content object's fields. */
  readonly fields: readonly FieldDescriptor[];
}

export interface CollectionSectionDescriptor extends DescriptorBase {
  readonly cardinality: 'collection';
  readonly min?: number;
  readonly max?: number;
  /** Render order within every item. A collection's content object is `{ items: [...] }`. */
  readonly itemFields: readonly FieldDescriptor[];
  /** Section-level fields sitting alongside `items`, e.g. a legend. */
  readonly sectionFields?: readonly FieldDescriptor[];
}

export type SectionDescriptor =
  | SingleSectionDescriptor
  | CollectionSectionDescriptor;

/** One failure, addressed to the field it belongs to. Returned, never thrown. */
export interface FieldError {
  /** Dotted path within the section's content object. */
  readonly path: string;
  readonly message: string;
}

/** One entry in a portfolio's ordered section array. */
export interface SectionInstance {
  readonly type: SectionType;
  readonly enabled: boolean;
  readonly order: number;
  readonly content: unknown;
}
