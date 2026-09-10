/**
 * The section registry's vocabulary. Framework-free by construction — this
 * file imports nothing but its sibling field types, so `api`, `admin` and
 * `portfolio` can each depend on it without inheriting a runtime (FR-REG-1).
 */

import type { FieldDescriptor } from './fields';

/** The thirteen declared section types (SRS §4.1). */
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
  /*
   * Registry order is the default section order, so `trainings` sits directly
   * after `achievements` and before `gallery` (SRS §4.1). It shares that
   * neighbour's field schema verbatim and none of its Credly path.
   */
  'trainings',
  'gallery',
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

/** Source-document priority, carried through unchanged (SRS §1.4). */
export type Priority = 'must' | 'should' | 'could';

interface DescriptorBase {
  readonly type: SectionType;
  readonly label: string;
  readonly description: string;
  readonly priority: Priority;
  /** Identifier in the source business requirements document. */
  readonly businessRef: string;
  /**
   * True when the section counts as empty and must be omitted from the page
   * entirely — no heading, no wrapper (FR-CFG-2, business req 18.1).
   */
  readonly emptyCondition: (content: unknown) => boolean;
}

export interface SingleSectionDescriptor extends DescriptorBase {
  readonly cardinality: 'single';
  /** Render order of the content object's fields (FR-REG-2). */
  readonly fields: readonly FieldDescriptor[];
}

export interface CollectionSectionDescriptor extends DescriptorBase {
  readonly cardinality: 'collection';
  readonly min?: number;
  readonly max?: number;
  /**
   * Render order within every item, applied identically to each one
   * (FR-REG-2). A collection's content object is `{ items: [...] }`.
   */
  readonly itemFields: readonly FieldDescriptor[];
  /** Section-level fields sitting alongside `items`, e.g. a legend. */
  readonly sectionFields?: readonly FieldDescriptor[];
}

export type SectionDescriptor =
  | SingleSectionDescriptor
  | CollectionSectionDescriptor;

/**
 * One failure, addressed to the field it belongs to.
 *
 * FR-API-4 asks for field-level errors, so an operation that cannot complete
 * says which field the tenant should look at rather than failing wholesale.
 * Returned, never thrown — a Credly import that cannot reach the upstream
 * comes back as one of these and not as a 500.
 */
export interface FieldError {
  /** Dotted path within the section's content object. */
  readonly path: string;
  readonly message: string;
}

/** One entry in a portfolio's ordered section array (SRS §5.2). */
export interface SectionInstance {
  readonly type: SectionType;
  readonly enabled: boolean;
  readonly order: number;
  readonly content: unknown;
}
