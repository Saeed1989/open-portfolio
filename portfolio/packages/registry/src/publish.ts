/**
 * Publish-time validation for the `projects` section.
 *
 * FR-SEC-PROJ-11 makes the seven modal-level fields required for publish, not
 * for save: a draft may be half-written, and it is the publish that insists on
 * a complete case study behind every card. That split is why these checks live
 * here rather than in `emptyCondition`, which answers a different question —
 * whether a section renders at all (FR-CFG-2).
 *
 * Like the empty predicates, every function takes `unknown`. The api runs them
 * over documents straight out of MongoDB, so nothing may assume the shape is
 * already valid.
 *
 * Failures are returned, never thrown, and every one is collected before
 * returning: FR-PUB-6 requires a publish to report all of its failures at
 * once, per field, rather than stopping at the first.
 *
 * The api owns the write path and does not exist in this repository yet, so
 * nothing calls this in anger. It lives in the registry because FR-REG-1 puts
 * validation rules in the registry — the api is meant to import them, not to
 * restate them.
 */

import type { FieldError } from './types';
import { hasItems, hasText, isRecord } from './empty';

/**
 * The seven, in the order the descriptor declares them, paired with the label
 * a tenant sees. Kept as data so the message and the path agree by
 * construction.
 */
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

/**
 * True when a value carries something publishable. A tag list needs at least
 * one tag; a body needs text once trimmed.
 */
function isPresent(value: unknown): boolean {
  return Array.isArray(value) ? hasItems(value) : hasText(value);
}

/**
 * Every modal-level field missing from one project, addressed to the item it
 * belongs to. `index` is the item's position in the collection, which is what
 * makes the path resolvable in an admin form that renders items as a list.
 */
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

/**
 * The same check across a whole `projects` content object.
 *
 * The 3–5 cap (FR-SEC-PROJ-2) is deliberately not repeated here — it is
 * enforced on write, and this runs later over content that already passed it.
 */
export function validateProjectsForPublish(content: unknown): FieldError[] {
  if (!isRecord(content) || !Array.isArray(content.items)) return [];
  return content.items.flatMap((item, index) => validateProjectItem(item, index));
}
