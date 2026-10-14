/**
 * Predicate helpers behind every `emptyCondition`. They take `unknown`
 * because they run over stored documents; malformed content counts as empty.
 */

type Dict = Record<string, unknown>;

export function isRecord(value: unknown): value is Dict {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A string that carries something once trimmed. */
export function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function hasItems(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

/** True when every named key on `content` is blank. */
export function allBlank(content: unknown, keys: readonly string[]): boolean {
  if (!isRecord(content)) return true;
  return keys.every((key) => {
    const value = content[key];
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'number') return false;
    if (typeof value === 'boolean') return !value;
    if (isRecord(value)) return Object.keys(value).length === 0;
    return false;
  });
}

/**
 * The default for a collection: empty when `items` holds nothing. An optional
 * `keep` predicate discounts items that would themselves render as nothing.
 */
export function collectionIsEmpty(
  content: unknown,
  keep?: (item: unknown) => boolean,
): boolean {
  if (!isRecord(content)) return true;
  const items = content.items;
  if (!Array.isArray(items)) return true;
  return (keep ? items.filter(keep) : items).length === 0;
}
