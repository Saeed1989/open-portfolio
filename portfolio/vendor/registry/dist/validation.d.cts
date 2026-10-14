import { F as FieldError } from './types-DjzuMzCj.cjs';

/**
 * Publish-time validation for the `projects` section: the seven modal-level
 * fields are required at publish, not at save. Every function takes `unknown`,
 * since it runs over stored documents, and every failure is collected and
 * returned rather than stopping at the first.
 */

/** Every modal-level field missing from one project, addressed by the item's index. */
declare function validateProjectItem(item: unknown, index: number): FieldError[];
/** The same check across a whole `projects` content object. The item cap is not checked here. */
declare function validateProjectsForPublish(content: unknown): FieldError[];

export { validateProjectItem, validateProjectsForPublish };
