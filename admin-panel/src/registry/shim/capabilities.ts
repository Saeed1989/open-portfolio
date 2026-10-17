import type {
  CollectionSectionDescriptor,
  FieldDescriptor,
  SectionDescriptor,
} from './types';

/*
 * TEMPORARY. `hideable` and `itemPublishFlag` belong on the descriptors in
 * `packages/registry`, which cannot express them yet. This overlay names keys
 * the package already declares and adds one flag to each; it invents no
 * field. Delete it when the package gains the two flags.
 */

/** Fields the tenant may hide, keyed by section type. */
const HIDEABLE_FIELDS: Readonly<Record<string, readonly string[]>> = {
  /* Each link has an independent visibility toggle. */
  contact: ['email', 'github', 'linkedin', 'x', 'site'],
  /* GPA, coursework, scholarships and honours are individually hideable,
     per entry. */
  education: ['gpa', 'coursework', 'scholarships', 'honours'],
};

/**
 * Collections whose items carry their own `published` flag: `achievements`,
 * where imported badges arrive unpublished, and `trainings`, which reuses the
 * achievements field schema.
 */
const ITEM_PUBLISH_FLAG: readonly string[] = ['achievements', 'trainings'];

function withHideable(
  fields: readonly FieldDescriptor[],
  hideableKeys: readonly string[],
): readonly FieldDescriptor[] {
  if (hideableKeys.length === 0) return fields;
  return fields.map((field) =>
    hideableKeys.includes(field.key) ? { ...field, hideable: true } : field,
  );
}

/**
 * Applies the overlay to one descriptor.
 *
 * Returns the descriptor unchanged when it has no entry, so the cost of the
 * overlay is paid only by the sections that need it and every other section
 * reaches the renderer exactly as the package declared it.
 */
export function applyCapabilities(
  descriptor: SectionDescriptor,
): SectionDescriptor {
  const hideableKeys = HIDEABLE_FIELDS[descriptor.type] ?? [];
  const needsItemFlag = ITEM_PUBLISH_FLAG.includes(descriptor.type);

  if (hideableKeys.length === 0 && !needsItemFlag) return descriptor;

  if (descriptor.cardinality === 'single') {
    return { ...descriptor, fields: withHideable(descriptor.fields, hideableKeys) };
  }

  const next: CollectionSectionDescriptor = {
    ...descriptor,
    itemFields: withHideable(descriptor.itemFields, hideableKeys),
    ...(needsItemFlag ? { itemPublishFlag: true } : {}),
  };
  return next;
}

/** Exposed for the invariant test, which must read what the overlay claims. */
export const OVERLAY = {
  hideableFields: HIDEABLE_FIELDS,
  itemPublishFlag: ITEM_PUBLISH_FLAG,
} as const;
