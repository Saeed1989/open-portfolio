/** A data kind, not a widget name: each consumer may draw the same kind differently. */
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
