import type {
  FieldDescriptor,
  SectionDescriptor,
  ValidationError,
} from './types';

/*
 * TEMPORARY. Publish validation, generic over descriptors.
 *
 * The package has `validateProjectsForPublish`, which hand-lists the seven
 * modal-level fields of FR-SEC-PROJ-11 and walks only those. That is the right
 * shape for a rule the descriptor cannot express, and the wrong shape for
 * `required` — which every descriptor already declares. Nothing here knows a
 * section type: it reads `required`, `requiredWhen`, `hideable`, `min` and
 * `max` off whatever descriptor it is handed, which is what makes FR-REG-3
 * hold — a new section type is a registry entry and no change here.
 *
 * FR-REG-8: this is publish-time only. Draft writes validate shape, type and
 * enumeration; `required` is not checked until a publish is attempted, so a
 * tenant can leave a field half-written and still save.
 *
 * FR-PUB-6: every failure is collected. Nothing returns early.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The key holding a content object's per-field visibility.
 *
 * Visibility sits *beside* the values rather than wrapping them, so a field's
 * value type is the same whether or not it is hideable. A wrapper would make
 * `email` a string in one section and `{ value, visible }` in another, and
 * every consumer — the api's shape validation, the builder, the portfolio
 * components — would have to know which.
 */
export const VISIBILITY_KEY = 'visibility';

/**
 * A field's value, read the same way whether or not it is hideable.
 *
 * One accessor so the renderer and the validator cannot disagree about where
 * a value lives.
 */
export function readFieldValue(
  field: FieldDescriptor,
  content: unknown,
): unknown {
  if (!isRecord(content)) return undefined;
  return content[field.key];
}

/**
 * A hideable field the tenant has switched off.
 *
 * Absent means visible: a draft written before this field became hideable, or
 * one the tenant has never touched, shows its content rather than silently
 * withholding it. Hiding is the deliberate act, so it is the one that has to
 * be recorded.
 */
export function isFieldHidden(
  field: FieldDescriptor,
  content: unknown,
): boolean {
  if (!field.hideable) return false;
  if (!isRecord(content)) return false;
  const map = content[VISIBILITY_KEY];
  if (!isRecord(map)) return false;
  return map[field.key] === false;
}

/**
 * An item the tenant has not promoted, in a collection that carries the flag.
 *
 * Only meaningful where the descriptor sets `itemPublishFlag`. Absent means
 * published: a hand-entered item is published by default, and only an import
 * arrives unpublished (FR-SEC-ACH-5).
 */
export function isItemUnpublished(
  descriptor: SectionDescriptor,
  item: unknown,
): boolean {
  if (descriptor.cardinality !== 'collection') return false;
  if (!descriptor.itemPublishFlag) return false;
  if (!isRecord(item)) return false;
  return item.published === false;
}

/** True when a value carries something publishable. */
export function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return value;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return false;
}

/**
 * Whether a field must hold a value before this portfolio can be published,
 * given what its siblings currently hold.
 *
 * Three rules, in order:
 *   - a hidden field is never required — insisting on a value that will not be
 *     rendered is a demand with no consequence;
 *   - `required: true` is unconditional;
 *   - `requiredWhen` asks a sibling.
 */
export function isRequiredNow(
  field: FieldDescriptor,
  siblings: unknown,
): boolean {
  if (isFieldHidden(field, siblings)) return false;
  if (field.required === true) return true;

  const condition = field.requiredWhen;
  if (!condition) return false;
  if (!isRecord(siblings)) return false;

  const other = siblings[condition.field];
  if (condition.oneOf) {
    return (
      typeof other === 'string' &&
      condition.oneOf.includes(other)
    );
  }
  return condition.present === true ? hasValue(other) : false;
}

function requiredMessage(field: FieldDescriptor, siblings: unknown): string {
  const condition = field.requiredWhen;
  if (condition && field.required !== true) {
    return `${field.label} is required to publish, because ${describeTrigger(condition.field, siblings)}.`;
  }
  return `${field.label} is required to publish.`;
}

function describeTrigger(key: string, siblings: unknown): string {
  const value = isRecord(siblings) ? siblings[key] : undefined;
  return typeof value === 'string' && value.trim() !== ''
    ? `another field is set to "${value}"`
    : 'another field is set';
}

/** Every field the renderer will draw, in registry order. */
function visibleFields(
  fields: readonly FieldDescriptor[],
): readonly FieldDescriptor[] {
  return fields.filter((field) => field.hidden !== true);
}

function validateFields(
  fields: readonly FieldDescriptor[],
  content: unknown,
  prefix: string,
): ValidationError[] {
  return visibleFields(fields).flatMap((field) => {
    if (!isRequiredNow(field, content)) return [];
    if (hasValue(readFieldValue(field, content))) return [];
    return [
      {
        path: `${prefix}${field.key}`,
        code: 'required',
        message: requiredMessage(field, content),
      },
    ];
  });
}

function items(content: unknown): readonly unknown[] {
  if (!isRecord(content)) return [];
  return Array.isArray(content.items) ? content.items : [];
}

/**
 * Every reason this section cannot be published, addressed by path.
 *
 * Paths are `key` for a single section and `items[2].key` inside a
 * collection — the same addressing the package's project validator uses, and
 * the same the admin form binds gap state by.
 */
export function validateForPublish(
  descriptor: SectionDescriptor,
  content: unknown,
): ValidationError[] {
  if (descriptor.cardinality === 'single') {
    return validateFields(descriptor.fields, content, '');
  }

  /*
   * Unpublished items leave the set entirely: they are not validated, and they
   * do not count toward `min` or `max`.
   *
   * Both halves matter. An imported badge the tenant has not promoted must not
   * block a publish for want of a field they were never asked to fill; and a
   * collection of five items where two are unpublished publishes three, so
   * three is the number a bound is about.
   *
   * `index` is kept from the original array so error paths still address the
   * row the form renders.
   */
  const allRows = items(content);
  const counted = allRows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !isItemUnpublished(descriptor, row));
  const rows = counted.map(({ row }) => row);
  const errors: ValidationError[] = [];

  /* A collection's minimum is a publish rule, never a save rule: a tenant
     cannot hold three projects while writing their first (FR-SEC-PROJ-2). */
  if (descriptor.min !== undefined && rows.length < descriptor.min) {
    errors.push({
      path: 'items',
      code: 'min_items',
      message: `Add at least ${String(descriptor.min)} ${descriptor.itemNoun ?? 'item'}${descriptor.min === 1 ? '' : 's'}. There ${rows.length === 1 ? 'is' : 'are'} ${String(rows.length)}.`,
    });
  }

  /* The maximum is enforced at save, so reaching it here means something got
     past the Add control. Reported rather than assumed impossible. */
  if (descriptor.max !== undefined && rows.length > descriptor.max) {
    errors.push({
      path: 'items',
      code: 'max_items',
      message: `Remove ${String(rows.length - descriptor.max)} — the maximum is ${String(descriptor.max)}.`,
    });
  }

  for (const { row, index } of counted) {
    errors.push(
      ...validateFields(
        descriptor.itemFields,
        row,
        `items[${String(index)}].`,
      ),
    );
  }

  if (descriptor.sectionFields) {
    errors.push(...validateFields(descriptor.sectionFields, content, ''));
  }

  return errors;
}

/**
 * The right rail's two numbers.
 *
 * "Fields complete x of y" counts every field the renderer draws, not only the
 * required ones — the mock's hero reads "7 of 8" against eight fields of which
 * two are required. It is a measure of how filled in the section is, which is
 * a different question from what blocks a publish, and the rail shows both
 * precisely because they differ.
 */
export interface SectionReadiness {
  readonly filled: number;
  readonly total: number;
  readonly blocking: number;
}

export function readiness(
  descriptor: SectionDescriptor,
  content: unknown,
  errors: readonly ValidationError[],
): SectionReadiness {
  let filled = 0;
  let total = 0;

  const count = (fields: readonly FieldDescriptor[], scope: unknown) => {
    for (const field of visibleFields(fields)) {
      total += 1;
      if (hasValue(readFieldValue(field, scope))) filled += 1;
    }
  };

  if (descriptor.cardinality === 'single') {
    count(descriptor.fields, content);
  } else {
    for (const row of items(content)) {
      /* An unpublished row is not part of what a publish would carry, so
         counting its empty fields would report a gap that is not one. */
      if (isItemUnpublished(descriptor, row)) continue;
      count(descriptor.itemFields, row);
    }
    if (descriptor.sectionFields) count(descriptor.sectionFields, content);
  }

  return { filled, total, blocking: errors.length };
}
