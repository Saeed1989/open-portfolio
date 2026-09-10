/**
 * The rich-text allowlist (FR-SEC-PROJ-12).
 *
 * Configuration, not a sanitiser. The package exports the allowlist and the
 * `api` feeds it to whichever sanitiser it depends on, so `sanitize-html` —
 * or any replacement for it — stays out of this package's dependencies and
 * out of `admin` and `portfolio` entirely.
 *
 * The three project `bodies.*` fields are the system's first rich text and
 * fix this list for every rich-text field added later, in any section type:
 * paragraph, unordered list, ordered list, list item, strong, emphasis,
 * underline, line break. No anchors, no images, no scripts, no styles, and
 * no attributes on any admitted tag (NFR-SEC-2, SRS §11.1).
 *
 * Sanitisation runs at write time, so what is stored is already safe. The
 * render path injects the stored markup as HTML and is safe only for that
 * reason — nothing downstream re-checks it.
 */

/** The only elements admitted. Everything else is stripped. */
export const RICH_TEXT_ALLOWED_TAGS = [
  'p',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'u',
  'br',
] as const;

export type RichTextAllowedTag = (typeof RICH_TEXT_ALLOWED_TAGS)[number];

/**
 * No attributes on any admitted tag. Held as an explicit empty map rather
 * than left absent, because a sanitiser handed no attribute configuration at
 * all commonly falls back to its own defaults — which admit `href`.
 */
export const RICH_TEXT_ALLOWED_ATTRIBUTES: Readonly<
  Record<string, readonly string[]>
> = {};

/** The fields this allowlist governs today, as dotted paths within a project item. */
export const RICH_TEXT_FIELDS = [
  'bodies.business',
  'bodies.solution',
  'bodies.role',
] as const;
