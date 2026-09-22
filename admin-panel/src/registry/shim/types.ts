/*
 * TEMPORARY. Delete this directory when `@portfolio/registry` carries what is
 * below — see admin-panel/README.md for the list.
 *
 * These types mirror the package's `FieldDescriptor` and `SectionDescriptor`
 * field for field, plus three additions the package does not have:
 * `requiredWhen`, `hideable` and `itemLabel`. The mirroring is deliberate and
 * load-bearing: the renderer is generic over *these* types, so when the
 * package grows the three additions, `src/registry/index.ts` swaps one import
 * and nothing in the renderer changes. A shim that invented its own vocabulary
 * would make that swap a rewrite.
 *
 * The package's own `FieldDescriptor.hidden` is not the same concern and is
 * kept with its original meaning: it means admin draws no input at all,
 * because the value is recorded rather than asked for. `hideable` below means
 * the tenant decides whether a value they *did* enter is rendered.
 */

/** Mirrors the package's `FieldKind` exactly. */
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

/**
 * A publish requirement that depends on a sibling field.
 *
 * FR-SEC-HERO-2 makes the CTA a typed choice with a label and a target; a
 * target is meaningless without a type and required once there is one. The
 * condition is data rather than code so that the renderer and the validator
 * evaluate it the same way, and so that a new conditional field costs a
 * descriptor entry rather than a branch (FR-REG-3).
 *
 * `field` names a sibling within the same content object — or, in a
 * collection, within the same item.
 */
export interface RequiredWhen {
  readonly field: string;
  /** Required once the sibling holds any value. */
  readonly present?: true;
  /** Required only when the sibling holds one of these values. */
  readonly oneOf?: readonly string[];
}

export interface FieldDescriptor {
  /** Key within the content object. */
  readonly key: string;
  readonly label: string;
  readonly kind: FieldKind;
  /** Required at publish, never at save (FR-REG-8). */
  readonly required?: boolean;
  readonly help?: string;
  readonly group?: string;
  readonly options?: readonly string[];
  /** Soft character guidance for text; hard cap for list and tags. */
  readonly max?: number;
  readonly defaultValue?: unknown;
  /** Package meaning, unchanged: admin draws no input for this field. */
  readonly hidden?: boolean;

  /* ---- Not in the package ---- */

  /** @see RequiredWhen */
  readonly requiredWhen?: RequiredWhen;
  /**
   * The field carries its own visibility toggle (FR-SEC-CON-2, FR-SEC-EDU-1).
   *
   * The value's type is unchanged; visibility is recorded beside it, in the
   * content object's `visibility` map. Hiding keeps the value — the tenant is
   * choosing not to publish it, not deleting it — and a hidden field is not
   * required at publish, because insisting on a value that will not be
   * rendered is a demand with no consequence.
   *
   * A field may not be both `hideable` and publish-`required`; the invariant
   * is asserted over every descriptor in `capabilities.test.ts`.
   */
  readonly hideable?: boolean;
  /** Placeholder shown when the field is empty. */
  readonly placeholder?: string;
  /** For `enum`: the label shown for each option, keyed by option value. */
  readonly optionLabels?: Readonly<Record<string, string>>;
}

interface DescriptorBase {
  readonly type: string;
  readonly label: string;
  readonly description: string;
  readonly priority: 'must' | 'should' | 'could';
  readonly businessRef: string;
  readonly emptyCondition: (content: unknown) => boolean;
}

export interface SingleSectionDescriptor extends DescriptorBase {
  readonly cardinality: 'single';
  /** Render order (FR-REG-2). */
  readonly fields: readonly FieldDescriptor[];
}

export interface CollectionSectionDescriptor extends DescriptorBase {
  readonly cardinality: 'collection';
  readonly min?: number;
  readonly max?: number;
  readonly itemFields: readonly FieldDescriptor[];
  readonly sectionFields?: readonly FieldDescriptor[];

  /* ---- Not in the package ---- */

  /**
   * How a collapsed row names itself: a template over the item's own keys,
   * `'{company} — {title}'`.
   *
   * It lives here because the mock's rule is that no section supplies its own
   * row renderer — one collection component draws every collection, and the
   * only thing that differs between them is which keys make a readable name.
   */
  readonly itemLabel?: string;
  /** Shown for an item whose every template key is blank. */
  readonly itemLabelFallback?: string;
  /** Singular noun for the Add control, e.g. 'role' gives "+ Add role". */
  readonly itemNoun?: string;
  /**
   * Items in this collection carry their own `published: boolean` (§5.2).
   *
   * True for `achievements`, because a Credly import cannot judge which badges
   * are high-signal and so arrives unpublished for the tenant to promote
   * (FR-SEC-ACH-5) — and for `trainings`, which reuses that field schema
   * verbatim (§4.1, FR-SEC-TRN-1) and therefore inherits the flag whether or
   * not it has an importer of its own.
   *
   * Absent means the collection has no per-item flag and every item publishes
   * with the section.
   */
  readonly itemPublishFlag?: boolean;
}

export type SectionDescriptor =
  | SingleSectionDescriptor
  | CollectionSectionDescriptor;

/**
 * One publish failure (D4).
 *
 * `{ path, code, message }` is exactly what `POST /admin/publish` is specified
 * to return per field (FR-API-4, FR-PUB-6), so the browser-side validator and
 * the server speak one shape and the form binds them the same way. The
 * package's `FieldError` is `{ path, message }` — the missing `code` is what
 * lets a caller branch on a rule without matching on prose.
 */
export interface ValidationError {
  /** `name`, or `items[2].company` inside a collection. */
  readonly path: string;
  readonly code: string;
  readonly message: string;
}
