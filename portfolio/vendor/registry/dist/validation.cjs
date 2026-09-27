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

// src/validation/index.ts
var validation_exports = {};
__export(validation_exports, {
  validateProjectItem: () => validateProjectItem,
  validateProjectsForPublish: () => validateProjectsForPublish
});
module.exports = __toCommonJS(validation_exports);

// src/empty.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

// src/validation/publish.ts
var REQUIRED_FOR_PUBLISH = [
  ["bodies.business", "Business case"],
  ["bodies.solution", "Solution"],
  ["designation", "My designation"],
  ["bodies.role", "My role"],
  ["stackWorkedOn", "Tech stack I worked on"],
  ["tools", "Tools"],
  ["fullStack", "Full tech stack"]
];
function at(source, path) {
  return path.split(".").reduce((value, key) => {
    return isRecord(value) ? value[key] : void 0;
  }, source);
}
function isPresent(value) {
  return Array.isArray(value) ? hasItems(value) : hasText(value);
}
function validateProjectItem(item, index) {
  return REQUIRED_FOR_PUBLISH.filter(([path]) => !isPresent(at(item, path))).map(
    ([path, label]) => ({
      path: `items[${index}].${path}`,
      message: `${label} is required before publishing.`
    })
  );
}
function validateProjectsForPublish(content) {
  if (!isRecord(content) || !Array.isArray(content.items)) return [];
  return content.items.flatMap((item, index) => validateProjectItem(item, index));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  validateProjectItem,
  validateProjectsForPublish
});
