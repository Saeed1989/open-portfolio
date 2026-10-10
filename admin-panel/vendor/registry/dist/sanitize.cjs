"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/sanitize.ts
var sanitize_exports = {};
__export(sanitize_exports, {
  RICH_TEXT_ALLOWED_ATTRIBUTES: () => RICH_TEXT_ALLOWED_ATTRIBUTES,
  RICH_TEXT_ALLOWED_TAGS: () => RICH_TEXT_ALLOWED_TAGS,
  RICH_TEXT_FIELDS: () => RICH_TEXT_FIELDS
});
module.exports = __toCommonJS(sanitize_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RICH_TEXT_ALLOWED_ATTRIBUTES,
  RICH_TEXT_ALLOWED_TAGS,
  RICH_TEXT_FIELDS
});
