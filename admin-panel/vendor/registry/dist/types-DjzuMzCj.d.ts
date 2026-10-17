/** A data kind, not a widget name: each consumer may draw the same kind differently. */
type FieldKind = 'text' | 'longtext' | 'url' | 'email' | 'date' | 'number' | 'boolean' | 'image' | 'tags' | 'list' | 'enum' | 'multiselect' | 'link';
interface FieldDescriptor {
    /** Key within the content object. */
    readonly key: string;
    /** Admin label, and the visible label wherever the renderer draws one. */
    readonly label: string;
    readonly kind: FieldKind;
    readonly required?: boolean;
    /** Admin help text. Never rendered publicly. */
    readonly help?: string;
    /** Consecutive fields with the same group render inside one wrapper. Never affects order. */
    readonly group?: string;
    /** Allowed values for `enum` and `multiselect`. */
    readonly options?: readonly string[];
    /** Soft character guidance for text, hard cap for list/tags. */
    readonly max?: number;
    /** Value a newly created section starts with. Never applied to existing content. */
    readonly defaultValue?: unknown;
    /** Admin draws no input for this field; it is still validated and rendered in order. */
    readonly hidden?: boolean;
}

/** The section registry's vocabulary. Framework-free: it imports only its sibling field types. */

/** The thirteen declared section types. */
declare const SECTION_TYPES: readonly ["hero", "projects", "skills", "contact", "experience", "education", "blog", "testimonials", "opensource", "speaking", "achievements", "trainings", "gallery"];
type SectionType = (typeof SECTION_TYPES)[number];
type Priority = 'must' | 'should' | 'could';
interface DescriptorBase {
    readonly type: SectionType;
    readonly label: string;
    readonly description: string;
    readonly priority: Priority;
    /** True when the section is empty and must be omitted from the page entirely. */
    readonly emptyCondition: (content: unknown) => boolean;
}
interface SingleSectionDescriptor extends DescriptorBase {
    readonly cardinality: 'single';
    /** Render order of the content object's fields. */
    readonly fields: readonly FieldDescriptor[];
}
interface CollectionSectionDescriptor extends DescriptorBase {
    readonly cardinality: 'collection';
    readonly min?: number;
    readonly max?: number;
    /** Render order within every item. A collection's content object is `{ items: [...] }`. */
    readonly itemFields: readonly FieldDescriptor[];
    /** Section-level fields sitting alongside `items`, e.g. a legend. */
    readonly sectionFields?: readonly FieldDescriptor[];
}
type SectionDescriptor = SingleSectionDescriptor | CollectionSectionDescriptor;
/** One failure, addressed to the field it belongs to. Returned, never thrown. */
interface FieldError {
    /** Dotted path within the section's content object. */
    readonly path: string;
    readonly message: string;
}
/** One entry in a portfolio's ordered section array. */
interface SectionInstance {
    readonly type: SectionType;
    readonly enabled: boolean;
    readonly order: number;
    readonly content: unknown;
}

export { type CollectionSectionDescriptor as C, type FieldError as F, type Priority as P, type SectionType as S, type SectionDescriptor as a, type SectionInstance as b, type FieldDescriptor as c, type FieldKind as d, SECTION_TYPES as e, type SingleSectionDescriptor as f };
