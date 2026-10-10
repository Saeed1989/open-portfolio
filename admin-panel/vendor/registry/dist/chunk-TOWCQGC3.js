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
function allBlank(content, keys) {
  if (!isRecord(content)) return true;
  return keys.every((key) => {
    const value = content[key];
    if (value === void 0 || value === null) return true;
    if (typeof value === "string") return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "number") return false;
    if (typeof value === "boolean") return !value;
    if (isRecord(value)) return Object.keys(value).length === 0;
    return false;
  });
}
function collectionIsEmpty(content, keep) {
  if (!isRecord(content)) return true;
  const items = content.items;
  if (!Array.isArray(items)) return true;
  return (keep ? items.filter(keep) : items).length === 0;
}

export {
  isRecord,
  hasText,
  hasItems,
  allBlank,
  collectionIsEmpty
};
