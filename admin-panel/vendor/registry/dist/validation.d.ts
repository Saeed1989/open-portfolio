import { F as FieldError } from './types-DhxjKKQp.js';

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

/**
 * Every modal-level field missing from one project, addressed to the item it
 * belongs to. `index` is the item's position in the collection, which is what
 * makes the path resolvable in an admin form that renders items as a list.
 */
declare function validateProjectItem(item: unknown, index: number): FieldError[];
/**
 * The same check across a whole `projects` content object.
 *
 * The 3–5 cap (FR-SEC-PROJ-2) is deliberately not repeated here — it is
 * enforced on write, and this runs later over content that already passed it.
 */
declare function validateProjectsForPublish(content: unknown): FieldError[];

export { validateProjectItem, validateProjectsForPublish };
