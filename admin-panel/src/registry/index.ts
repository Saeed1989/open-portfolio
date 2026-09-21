/*
 * The only file in this app that reaches the section registry.
 *
 * Everything else — the renderer, the editor page, the save machine, the
 * tests — imports from here. That is what makes the shim beneath it
 * replaceable: when `@portfolio/registry` carries `requiredWhen`, `hideable`,
 * `itemLabel` and a generic `validateForPublish`, this file changes its
 * imports and nothing else in the app does.
 *
 * It is also the reason a section type's name appears nowhere else in
 * `src/`. A caller asks for a descriptor by the `:type` in the URL and gets
 * one back, or does not; no caller names `hero` or `contact`.
 */

import { SHIM_DESCRIPTORS } from './shim/descriptors';
import type { SectionDescriptor } from './shim/types';

export type {
  CollectionSectionDescriptor,
  FieldDescriptor,
  FieldKind,
  RequiredWhen,
  SectionDescriptor,
  SingleSectionDescriptor,
  ValidationError,
} from './shim/types';

export {
  hasValue,
  isFieldHidden,
  isRequiredNow,
  readFieldValue,
  readiness,
  validateForPublish,
  type SectionReadiness,
} from './shim/validate';

/**
 * Every section type this build can edit.
 *
 * Two, for now, because the shim declares two. The renderer does not know
 * that: it renders whatever this list holds.
 */
export const DESCRIPTORS: readonly SectionDescriptor[] = SHIM_DESCRIPTORS;

/** The descriptor for a section type, or undefined for one we do not declare. */
export function descriptorFor(
  type: string | undefined,
): SectionDescriptor | undefined {
  if (type === undefined) return undefined;
  return DESCRIPTORS.find((descriptor) => descriptor.type === type);
}

/**
 * True while the registry beneath this seam is the temporary shim.
 *
 * Read by the dev banner on the editor page, so nobody mistakes two
 * hand-written descriptors for the whole registry.
 */
export const IS_SHIMMED: boolean = true;
