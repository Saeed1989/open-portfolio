/**
 * What a field *is*, independent of any section that declares one.
 *
 * Split out of types.ts when the registry became its own package: the section
 * descriptors in sections/ reference these, and so does admin's form
 * generator, without either needing the descriptor types themselves.
 */
/**
 * How a field is edited in admin, validated in the api, and rendered by the
 * portfolio. Deliberately a data *kind*, not a widget name — the same kind may
 * be drawn differently by each consumer.
 */
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
    /**
     * Admin draws no input for this field. It records where a value came from
     * rather than asking the tenant for it — the field still exists, is still
     * validated, and still takes its place in the render order (FR-REG-2).
     */
    readonly hidden?: boolean;
}

/**
 * The section registry's vocabulary. Framework-free by construction — this
 * file imports nothing but its sibling field types, so `api`, `admin` and
 * `portfolio` can each depend on it without inheriting a runtime (FR-REG-1).
 */

/** The thirteen declared section types (SRS §4.1). */
declare const SECTION_TYPES: readonly ["hero", "projects", "skills", "contact", "experience", "education", "blog", "testimonials", "opensource", "speaking", "achievements", "trainings", "gallery"];
type SectionType = (typeof SECTION_TYPES)[number];
/** Source-document priority, carried through unchanged (SRS §1.4). */
type Priority = 'must' | 'should' | 'could';
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
interface SingleSectionDescriptor extends DescriptorBase {
    readonly cardinality: 'single';
    /** Render order of the content object's fields (FR-REG-2). */
    readonly fields: readonly FieldDescriptor[];
}
interface CollectionSectionDescriptor extends DescriptorBase {
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
type SectionDescriptor = SingleSectionDescriptor | CollectionSectionDescriptor;
/**
 * One failure, addressed to the field it belongs to.
 *
 * FR-API-4 asks for field-level errors, so an operation that cannot complete
 * says which field the tenant should look at rather than failing wholesale.
 * Returned, never thrown — a Credly import that cannot reach the upstream
 * comes back as one of these and not as a 500.
 */
interface FieldError {
    /** Dotted path within the section's content object. */
    readonly path: string;
    readonly message: string;
}
/** One entry in a portfolio's ordered section array (SRS §5.2). */
interface SectionInstance {
    readonly type: SectionType;
    readonly enabled: boolean;
    readonly order: number;
    readonly content: unknown;
}

export { type CollectionSectionDescriptor as C, type FieldError as F, type Priority as P, type SectionType as S, type SectionDescriptor as a, type FieldDescriptor as b, type FieldKind as c, SECTION_TYPES as d, type SectionInstance as e, type SingleSectionDescriptor as f };
