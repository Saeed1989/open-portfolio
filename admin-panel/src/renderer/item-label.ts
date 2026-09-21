/*
 * How a collapsed collection row names itself.
 *
 * The mock's rule, stated on the Experience artboard: "Collapsed rows use the
 * registry's item label — '{company} — {title}' — plus the date range and a
 * gap count. No section supplies its own row renderer." So the template is
 * registry data and this is the only code that reads it.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g;

/**
 * Fills `'{company} — {title}'` from an item.
 *
 * Returns the fallback when every placeholder resolves to nothing, rather than
 * a row labelled with leftover punctuation — a new, empty row is the common
 * case and " — " is not a name.
 */
export function itemLabelFor(
  item: unknown,
  template: string | undefined,
  fallback: string,
  index: number,
): string {
  if (template === undefined) return `${fallback} ${String(index + 1)}`;

  /* Resolved up front rather than inside a `replace` callback: TypeScript
     cannot follow an assignment made in one, so a flag set there narrows to
     `false` and the fallback branch reads as dead code. */
  const resolved = new Map<string, string>();
  for (const match of template.matchAll(PLACEHOLDER)) {
    const key = match[1];
    if (key === undefined) continue;
    const value = isRecord(item) ? item[key] : undefined;
    resolved.set(
      key,
      typeof value === 'string'
        ? value.trim()
        : typeof value === 'number'
          ? String(value)
          : '',
    );
  }

  const filledAny = [...resolved.values()].some((text) => text !== '');
  if (!filledAny) return `${fallback} ${String(index + 1)}`;

  return template
    .replace(PLACEHOLDER, (_match, key: string) => resolved.get(key) ?? '')
    .trim();
}
