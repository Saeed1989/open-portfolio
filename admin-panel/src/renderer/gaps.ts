import type { ValidationError } from '../registry';
import type { Gap } from '../ui/field-chrome';

/*
 * Validation errors, keyed by the path the form binds a field at.
 *
 * The validator addresses failures by path — `name`, `items[2].company` — and
 * the renderer gives every control that same path as its id. This module is
 * the join, and it is the only place that knows the two agree.
 */

export interface GapState {
  readonly gap: Gap;
  readonly note: string | undefined;
}

const NONE: GapState = { gap: 'none', note: undefined };

export interface GapMap {
  /** The gap for one field path. */
  at: (path: string) => GapState;
  readonly blocking: number;
}

/**
 * Builds the map. Before a publish is attempted every gap is `'pending'`,
 * because `required` is enforced only at publish; a publish attempt turns the
 * same set red.
 */
export function buildGapMap(
  errors: readonly ValidationError[],
  publishAttempted: boolean,
): GapMap {
  const byPath = new Map<string, ValidationError>();
  for (const error of errors) {
    /* First failure per path wins. A field with two reasons shows the first
       the validator produced, and the rail still counts both. */
    if (!byPath.has(error.path)) byPath.set(error.path, error);
  }

  const gap: Gap = publishAttempted ? 'blocking' : 'pending';

  return {
    at: (path) => {
      const error = byPath.get(path);
      if (!error) return NONE;
      return { gap, note: error.message };
    },
    blocking: errors.length,
  };
}
