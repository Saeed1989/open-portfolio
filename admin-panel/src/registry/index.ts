import { REGISTRY } from '@portfolio/registry';
import { applyCapabilities } from './shim/capabilities';
import type { SectionDescriptor } from './shim/types';

/*
 * The only file in this app that reaches the section registry. No caller
 * names a section type: it asks for a descriptor by the `:type` in the URL.
 *
 * Descriptors come from `@portfolio/registry`, read through the types in
 * `./shim/types` because the package cannot yet express these:
 *
 *   itemLabel        a collapsed collection row reads "Untitled 1"
 *   hideable         supplied locally by ./shim/capabilities
 *   itemPublishFlag  supplied the same way
 *   requiredWhen     no conditional requirement, so the hero CTA target is
 *                    never required
 *   date precision   every date renders at month precision
 *
 * `validateForPublish` also stays local: the package validates `projects`
 * only. Moving these into the package and deleting `./shim` is the next step.
 */

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
  isItemUnpublished,
  isRequiredNow,
  readFieldValue,
  readiness,
  validateForPublish,
  VISIBILITY_KEY,
  type SectionReadiness,
} from './shim/validate';

/**
 * Every section type this build can edit, in registry order.
 *
 * Registry order is the default section order, so the list below
 * is also the order the sections index presents them in.
 */
export const DESCRIPTORS: readonly SectionDescriptor[] = Object.values(
  REGISTRY,
).map((descriptor) => applyCapabilities(descriptor));

/** The descriptor for a section type, or undefined for one we do not declare. */
export function descriptorFor(
  type: string | undefined,
): SectionDescriptor | undefined {
  if (type === undefined) return undefined;
  return DESCRIPTORS.find((descriptor) => descriptor.type === type);
}

/**
 * True while any part of the registry is still being supplied locally.
 *
 * Read by the dev banner on the editor page. The descriptors now come from the
 * package; the four field-level capabilities listed above do not, so this
 * stays true until `./shim` is gone.
 */
export const IS_SHIMMED: boolean = true;
