import {
  getDescriptor,
  isRecord,
  type FieldDescriptor,
  type FieldError,
  type SectionType,
} from '@portfolio/registry';

/*
 * Publish-time checks for one section's content: `required`, and a
 * collection's `min` and `max` (FR-REG-8). Every failure is collected
 * (FR-PUB-6).
 *
 * The registry exports no generic publish validator, so this walks its
 * descriptors, as section-content.ts does for a draft write. It names no
 * section type and no field (FR-REG-1). Rules a descriptor cannot express —
 * the prominent-skill count of FR-SEC-SKILL-3, a project's link unless
 * confidential (FR-SEC-PROJ-3) — are not checked here.
 */
export function validateSectionForPublish(
  type: SectionType,
  content: unknown,
): FieldError[] {
  const descriptor = getDescriptor(type);
  if (descriptor.cardinality === 'single') {
    return requiredErrors(descriptor.fields, content, '');
  }

  /* An unpublished item is not published, so it is neither validated nor
     counted (§5.2). Indexes stay those of the stored array. */
  const items: unknown[] =
    isRecord(content) && Array.isArray(content.items) ? content.items : [];
  const counted = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !(isRecord(item) && item.published === false));

  const errors: FieldError[] = [];
  if (descriptor.min !== undefined && counted.length < descriptor.min) {
    errors.push({
      path: 'items',
      message: `At least ${descriptor.min} items are required to publish; there are ${counted.length}.`,
    });
  }
  if (descriptor.max !== undefined && counted.length > descriptor.max) {
    errors.push({
      path: 'items',
      message: `At most ${descriptor.max} items.`,
    });
  }
  for (const { item, index } of counted) {
    errors.push(
      ...requiredErrors(descriptor.itemFields, item, `items[${index}].`),
    );
  }
  errors.push(...requiredErrors(descriptor.sectionFields ?? [], content, ''));
  return errors;
}

function requiredErrors(
  fields: readonly FieldDescriptor[],
  record: unknown,
  prefix: string,
): FieldError[] {
  return fields
    .filter((field) => field.required === true && field.hidden !== true)
    .filter((field) => !hasValue(valueAt(record, field.key.split('.'))))
    .map((field) => ({
      path: `${prefix}${field.key}`,
      message: `${field.label} is required to publish.`,
    }));
}

/* A dotted key such as `bodies.business` addresses a nested object. */
function valueAt(record: unknown, [head, ...rest]: string[]): unknown {
  if (!isRecord(record)) return undefined;
  return rest.length === 0 ? record[head] : valueAt(record[head], rest);
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return true;
}
