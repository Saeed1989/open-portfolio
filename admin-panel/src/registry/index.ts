import { REGISTRY } from '@portfolio/registry';
import type { SectionDescriptor } from './shim/types';

/*
 * The only file in this app that reaches the section registry.
 *
 * Everything else — the renderer, the editor page, the save machine, the
 * tests — imports from here. No caller names a section type: it asks for a
 * descriptor by the `:type` in the URL and gets one back, or does not. That is
 * FR-REG-3 on this side, and it is why adding a section type costs a registry
 * entry and no change to `admin`.
 *
 * Descriptors come from `@portfolio/registry` — all thirteen of them, the
 * single source of truth of FR-REG-1. The types they are read through still
 * come from `./shim/types`, because the package cannot yet express four things
 * the renderer uses. They are structurally compatible, so a package descriptor
 * satisfies the shim's type with the extra fields simply absent: the app
 * degrades feature by feature rather than failing to compile.
 *
 * What is still missing from the package, and what each absence costs:
 *
 *   itemLabel     a collapsed collection row reads "Untitled 1" instead of
 *                 "{company} — {title}"
 *   hideable      no per-field visibility toggle, so FR-SEC-EDU-1's four
 *                 hideable fields and FR-SEC-CON-2's five links render as
 *                 plain fields
 *   requiredWhen  no conditional requirement, so FR-SEC-HERO-2's CTA target
 *                 is never required
 *   date precision  every date renders at month precision; FR-SEC-BLOG-1 and
 *                 FR-SEC-SPK-1 want a full date
 *
 * `validateForPublish` also stays local: the package validates `projects`
 * only, by hand, and D4 needs a generic walk. Moving these five into the
 * package and deleting `./shim` is the next step, and nothing outside this
 * file changes when it happens.
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
  isRequiredNow,
  readFieldValue,
  readiness,
  validateForPublish,
  type SectionReadiness,
} from './shim/validate';

/**
 * Every section type this build can edit, in registry order.
 *
 * Registry order is the default section order (SRS §4.1), so the list below
 * is also the order the sections index presents them in.
 */
export const DESCRIPTORS: readonly SectionDescriptor[] =
  Object.values(REGISTRY);

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
