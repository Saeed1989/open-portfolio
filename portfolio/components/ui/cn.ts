/**
 * Joins class name fragments, dropping anything falsy.
 *
 * Deliberately tiny and dependency-free — primitives only ever need to merge a
 * variant lookup with an optional `className` from the caller.
 */
export function cn(
  ...parts: readonly (string | false | null | undefined)[]
): string {
  return parts.filter(Boolean).join(' ');
}
