import {
  hasItems,
  hasText,
  isRecord
} from "./chunk-TOWCQGC3.js";

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
export {
  validateProjectItem,
  validateProjectsForPublish
};
