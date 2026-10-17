/**
 * Publish-time validation for the `projects` section: the seven modal-level
 * fields are required at publish, not at save. Every function takes `unknown`,
 * since it runs over stored documents, and every failure is collected and
 * returned rather than stopping at the first.
 */

import type { FieldError } from '../types';
import { hasItems, hasText, isRecord } from '../empty';

/** The seven, in descriptor order, each with the label a tenant sees. */
const REQUIRED_FOR_PUBLISH: readonly (readonly [path: string, label: string])[] =
  [
    ['bodies.business', 'Business case'],
    ['bodies.solution', 'Solution'],
    ['designation', 'My designation'],
    ['bodies.role', 'My role'],
    ['stackWorkedOn', 'Tech stack I worked on'],
    ['tools', 'Tools'],
    ['fullStack', 'Full tech stack'],
  ];

/** Walks a dotted path, returning undefined rather than throwing part-way. */
function at(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    return isRecord(value) ? value[key] : undefined;
  }, source);
}

/** A tag list needs at least one tag; a body needs text once trimmed. */
function isPresent(value: unknown): boolean {
  return Array.isArray(value) ? hasItems(value) : hasText(value);
}

/** Every modal-level field missing from one project, addressed by the item's index. */
export function validateProjectItem(
  item: unknown,
  index: number,
): FieldError[] {
  return REQUIRED_FOR_PUBLISH.filter(([path]) => !isPresent(at(item, path))).map(
    ([path, label]) => ({
      path: `items[${index}].${path}`,
      message: `${label} is required before publishing.`,
    }),
  );
}

/** The same check across a whole `projects` content object. The item cap is not checked here. */
export function validateProjectsForPublish(content: unknown): FieldError[] {
  if (!isRecord(content) || !Array.isArray(content.items)) return [];
  return content.items.flatMap((item, index) => validateProjectItem(item, index));
}
