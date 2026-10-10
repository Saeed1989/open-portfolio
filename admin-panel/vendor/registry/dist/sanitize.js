// src/sanitize.ts
var RICH_TEXT_ALLOWED_TAGS = [
  "p",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "u",
  "br"
];
var RICH_TEXT_ALLOWED_ATTRIBUTES = {};
var RICH_TEXT_FIELDS = [
  "bodies.business",
  "bodies.solution",
  "bodies.role"
];
export {
  RICH_TEXT_ALLOWED_ATTRIBUTES,
  RICH_TEXT_ALLOWED_TAGS,
  RICH_TEXT_FIELDS
};
