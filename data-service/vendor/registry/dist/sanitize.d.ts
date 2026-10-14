/**
 * The rich-text allowlist, shared by every rich-text field in any section
 * type. Configuration only: `api` feeds it to its own sanitiser at write
 * time. The render path injects stored markup as HTML and re-checks nothing.
 */
/** The only elements admitted. Everything else is stripped. */
declare const RICH_TEXT_ALLOWED_TAGS: readonly ["p", "ul", "ol", "li", "strong", "em", "u", "br"];
type RichTextAllowedTag = (typeof RICH_TEXT_ALLOWED_TAGS)[number];
/**
 * No attributes on any admitted tag. An explicit empty map, because a
 * sanitiser given no attribute configuration falls back to defaults that
 * admit `href`.
 */
declare const RICH_TEXT_ALLOWED_ATTRIBUTES: Readonly<Record<string, readonly string[]>>;
/** The fields this allowlist governs today, as dotted paths within a project item. */
declare const RICH_TEXT_FIELDS: readonly ["bodies.business", "bodies.solution", "bodies.role"];

export { RICH_TEXT_ALLOWED_ATTRIBUTES, RICH_TEXT_ALLOWED_TAGS, RICH_TEXT_FIELDS, type RichTextAllowedTag };
