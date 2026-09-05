/**
 * The section registry's vocabulary. Framework-free by construction — this
 * file imports nothing, so `api`, `admin` and `portfolio` can each depend on
 * it without inheriting a runtime (FR-REG-1).
 */

/** The twelve declared section types (SRS §4.1). */
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
  'gallery',
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

/** Source-document priority, carried through unchanged (SRS §1.4). */
export type Priority = 'must' | 'should' | 'could';

/**
 * How a field is edited in admin, validated in the api, and rendered by the
 * portfolio. Deliberately a data *kind*, not a widget name — the same kind may
 * be drawn differently by each consumer.
 */
export type FieldKind =
  | 'text'
  | 'longtext'
  | 'url'
  | 'email'
  | 'date'
  | 'number'
  | 'boolean'
  | 'image'
  | 'tags'
  | 'list'
  | 'enum'
  | 'multiselect'
  | 'link';

export interface FieldDescriptor {
  /** Key within the content object. */
  readonly key: string;
  /** Admin label, and the visible label wherever the renderer draws one. */
  readonly label: string;
  readonly kind: FieldKind;
  readonly required?: boolean;
  /** Admin help text. Never rendered publicly. */
  readonly help?: string;
  /**
   * Consecutive fields carrying the same group name are rendered inside one
   * wrapper by the section component. Order still comes from this array — the
   * group only decides what encloses a run of fields, never their sequence.
   */
  readonly group?: string;
  /** Allowed values for `enum` and `multiselect`. */
  readonly options?: readonly string[];
  /** Soft character guidance for text, hard cap for list/tags. */
  readonly max?: number;
  /**
   * Value a newly created section starts with. Admin seeds its form from this;
   * it is never applied to content that already exists, so adding a default
   * cannot retroactively change a published portfolio (FR-REG-4).
   */
  readonly defaultValue?: unknown;
}

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

/** One entry in a portfolio's ordered section array (SRS §5.2). */
export interface SectionInstance {
  readonly type: SectionType;
  readonly enabled: boolean;
  readonly order: number;
  readonly content: unknown;
}
