import type {
  CollectionSectionDescriptor,
  FieldDescriptor,
  SectionDescriptor,
} from './types';

/*
 * TEMPORARY, and the most temporary thing in this app.
 *
 * `hideable` and `itemPublishFlag` belong on the descriptors in
 * `packages/registry` — FR-REG-1 makes the registry the single source of truth
 * and FR-REG-3 says a section's behaviour must not require a change to
 * `admin`. This file is a change to `admin` that encodes section behaviour, so
 * it is a deliberate, marked violation of both, and it exists only because the
 * package cannot express these two capabilities yet.
 *
 * It is written as an overlay rather than as forked descriptors so that the
 * breach is as small and as visible as possible: it names keys the package
 * already declares and adds one flag to each. It invents no field, renames
 * nothing, and changes no value type. When the package gains the two flags,
 * this file is deleted and `index.ts` stops applying it — nothing else moves.
 *
 * Every entry below cites the requirement that puts it there. An entry with no
 * citation is scope creep and should be refused in review.
 */

/** Fields the tenant may hide, keyed by section type. */
const HIDEABLE_FIELDS: Readonly<Record<string, readonly string[]>> = {
  /* FR-SEC-CON-2 — "Each link has an independent visibility toggle." */
  contact: ['email', 'github', 'linkedin', 'x', 'site'],
  /* FR-SEC-EDU-1 — "plus individually hideable GPA, coursework,
     scholarships, honours", per entry. */
  education: ['gpa', 'coursework', 'scholarships', 'honours'],
};

/**
 * Collections whose items carry their own `published` flag.
 *
 * `achievements` because FR-SEC-ACH-5 has imported badges arrive unpublished
 * for the tenant to promote. `trainings` because §4.1 and FR-SEC-TRN-1 say it
 * reuses the achievements field schema verbatim — the flag comes with the
 * schema, and a type that shares a schema cannot selectively not share part of
 * it without the two ceasing to be the same schema.
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
