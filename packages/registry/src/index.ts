/**
 * The `@portfolio/registry` entrypoint — the descriptors and the vocabulary
 * around them. All three apps consume this one.
 *
 * Zero runtime dependencies, and nothing that needs one. Validation lives
 * behind `@portfolio/registry/validation` and the rich-text allowlist behind
 * `@portfolio/registry/sanitize`, so the public site carries neither.
 */

export * from './types';
export * from './fields';
export * from './version';
export * from './content';
export * from './empty';
export * from './sections';
export * from './credly/parse';
export * from './credly/import';
