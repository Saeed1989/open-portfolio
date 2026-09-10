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
  /**
   * Admin draws no input for this field. It records where a value came from
   * rather than asking the tenant for it — the field still exists, is still
   * validated, and still takes its place in the render order (FR-REG-2).
   */
  readonly hidden?: boolean;
}
