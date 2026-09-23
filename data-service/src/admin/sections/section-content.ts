import { Types } from 'mongoose';
import sanitizeHtml from 'sanitize-html';
import {
  getDescriptor,
  type FieldDescriptor,
  type FieldError,
  type SectionType,
} from '@portfolio/registry';
import {
  RICH_TEXT_ALLOWED_ATTRIBUTES,
  RICH_TEXT_ALLOWED_TAGS,
  RICH_TEXT_FIELDS,
} from '@portfolio/registry/sanitize';

/*
 * Draft-time checks for one section's content: shape, type, and enumeration
 * only (FR-REG-8), plus the collection `max` at save. `required` and `min`
 * wait for publish, so half-written content saves.
 *
 * The registry exports no draft validator, so this walks its descriptors
 * generically. It names no section type and no field (FR-REG-1); a type
 * added under FR-REG-3 is validated with no change here.
 */

/** Seeded ids are slugs; generated ones are ObjectId hex. Both fit. */
const ITEM_ID = /^[A-Za-z0-9_-]{1,64}$/;

/* Copied into sanitize-html's mutable shape; the values are the registry's. */
const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...RICH_TEXT_ALLOWED_TAGS],
  allowedAttributes: Object.fromEntries(
    Object.entries(RICH_TEXT_ALLOWED_ATTRIBUTES).map(([tag, attributes]) => [
      tag,
      [...attributes],
    ]),
  ),
};

const RICH_TEXT_KEYS: readonly string[] = RICH_TEXT_FIELDS;

export function validateDraftContent(
  type: SectionType,
  content: Record<string, unknown>,
): FieldError[] {
  const descriptor = getDescriptor(type);
  const errors: FieldError[] = [];

  if (descriptor.cardinality === 'single') {
    checkRecord(descriptor.fields, content, '', errors);
    return errors;
  }

  checkRecord(descriptor.sectionFields ?? [], content, '', errors);
  const items = content.items;
  if (items === undefined) return errors;
  if (!Array.isArray(items)) {
    errors.push({ path: 'items', message: 'Must be a list.' });
    return errors;
  }

  /* D-E: `max` is enforced at save for every collection declaring one,
     generalising FR-SEC-PROJ-2. `min` stays at publish. */
  if (descriptor.max !== undefined && items.length > descriptor.max) {
    errors.push({
      path: 'items',
      message: `At most ${descriptor.max} items.`,
    });
  }

  const seen = new Map<string, number>();
  items.forEach((item: unknown, index) => {
    const path = `items[${index}]`;
    checkRecord(descriptor.itemFields, item, path, errors);
    if (!isRecord(item) || item.id === undefined) return;

    const id = item.id;
    if (typeof id !== 'string' || !ITEM_ID.test(id)) {
      errors.push({ path: `${path}.id`, message: 'Invalid item id.' });
    } else if (seen.has(id)) {
      errors.push({
        path: `${path}.id`,
        message: `Duplicates the id of items[${seen.get(id)}].`,
      });
    } else {
      seen.set(id, index);
    }
  });

  return errors;
}

/**
 * The content as stored: collection items missing an id get one, and every
 * rich-text field is sanitised against the registry's allowlist
 * (FR-SEC-PROJ-12). Call only on content `validateDraftContent` passed.
 */
export function prepareDraftContent(
  type: SectionType,
  content: Record<string, unknown>,
): Record<string, unknown> {
  const descriptor = getDescriptor(type);
  if (descriptor.cardinality === 'single') {
    return sanitiseRichText(descriptor.fields, content);
  }
  if (!Array.isArray(content.items)) return content;

  return {
    ...content,
    items: content.items.map((item: Record<string, unknown>) => {
      const sanitised = sanitiseRichText(descriptor.itemFields, item);
      return sanitised.id === undefined
        ? { id: new Types.ObjectId().toHexString(), ...sanitised }
        : sanitised;
    }),
  };
}

/*
 * Checks every declared key present in `value`. A dotted key such as
 * `bodies.business` is a field of a nested object, checked as a record of its
 * own. Undeclared keys pass: the descriptors omit keys the SRS specifies —
 * a skill's `order` (FR-SEC-SKILL-1), an achievement's `published` (§5.2) —
 * so rejecting them would refuse valid content.
 */
function checkRecord(
  fields: readonly FieldDescriptor[],
  value: unknown,
  path: string,
  errors: FieldError[],
): void {
  if (!isRecord(value)) {
    errors.push({ path, message: 'Must be an object.' });
    return;
  }

  const direct = new Map<string, FieldDescriptor>();
  const nested = new Map<string, FieldDescriptor[]>();
  for (const field of fields) {
    const [head, ...rest] = field.key.split('.');
    if (rest.length === 0) {
      direct.set(head, field);
    } else {
      nested.set(head, [
        ...(nested.get(head) ?? []),
        { ...field, key: rest.join('.') },
      ]);
    }
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    const field = direct.get(key);
    const group = nested.get(key);
    if (field) {
      const message = kindError(field, child);
      if (message) errors.push({ path: childPath, message });
    } else if (group) {
      checkRecord(group, child, childPath, errors);
    }
  }
}

/* Type and enumeration per field kind — never presence (FR-REG-8). */
function kindError(field: FieldDescriptor, value: unknown): string | null {
  switch (field.kind) {
    case 'text':
    case 'longtext':
    case 'date':
      return typeof value === 'string' ? null : 'Must be text.';
    /* contact declares `email` with this kind, but the registry's content
       type, its emptyCondition, and every seed store a link object there. */
    case 'email':
      return typeof value === 'string' || isRecord(value)
        ? null
        : 'Must be text or a link.';
    case 'url':
      return typeof value === 'string' && (value === '' || isHttpUrl(value))
        ? null
        : 'Must be an http or https URL.';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? null
        : 'Must be a number.';
    case 'boolean':
      return typeof value === 'boolean' ? null : 'Must be true or false.';
    case 'enum':
      return typeof value === 'string' && isOption(field, value)
        ? null
        : `Must be one of: ${(field.options ?? []).join(', ')}.`;
    case 'multiselect':
      return Array.isArray(value) &&
        value.every(
          (entry) => typeof entry === 'string' && isOption(field, entry),
        )
        ? null
        : `Must be a list drawn from: ${(field.options ?? []).join(', ')}.`;
    case 'tags':
      return Array.isArray(value) &&
        value.every((entry) => typeof entry === 'string')
        ? null
        : 'Must be a list of text.';
    /* The registry declares no inner shape for these three kinds, so only
       the outer one is checked. `list` also admits an object: opensource
       declares `stats` as a list and stores a record of figures. */
    case 'list':
      return Array.isArray(value) || isRecord(value) ? null : 'Must be a list.';
    case 'image':
      return value === null || isRecord(value)
        ? null
        : 'Must be an image or null.';
    case 'link':
      return isRecord(value) ? null : 'Must be a link.';
  }
}

function sanitiseRichText(
  fields: readonly FieldDescriptor[],
  record: Record<string, unknown>,
): Record<string, unknown> {
  return fields
    .filter((field) => RICH_TEXT_KEYS.includes(field.key))
    .reduce(
      (current, field) => sanitiseAt(current, field.key.split('.')),
      record,
    );
}

function sanitiseAt(
  record: Record<string, unknown>,
  [head, ...rest]: string[],
): Record<string, unknown> {
  const value = record[head];
  if (rest.length === 0) {
    return typeof value === 'string'
      ? { ...record, [head]: sanitizeHtml(value, RICH_TEXT_OPTIONS) }
      : record;
  }
  return isRecord(value)
    ? { ...record, [head]: sanitiseAt(value, rest) }
    : record;
}

function isOption(field: FieldDescriptor, value: string): boolean {
  return (field.options ?? []).includes(value);
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
