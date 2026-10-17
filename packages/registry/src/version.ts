/**
 * The registry's version. A portfolio records the one it was authored against
 * (`registryVersion`), so a later registry cannot retroactively invalidate it.
 *
 * A bump is additive only: a new section type, optional field, help text, or
 * enum option. A change that could fail an older document needs a migration,
 * not a bump.
 *
 * History:
 *   1  The first twelve section types.
 *   2  Adds `trainings`.
 */
export const REGISTRY_VERSION = 2;

/** The oldest version this registry can still read without a migration. */
export const MIN_SUPPORTED_REGISTRY_VERSION = 1;

/**
 * True when a portfolio authored at `version` can be validated and published
 * against this registry. A version from the future cannot: it may carry a
 * section type or field this build does not know.
 */
export function isSupportedRegistryVersion(version: unknown): boolean {
  return (
    typeof version === 'number' &&
    Number.isInteger(version) &&
    version >= MIN_SUPPORTED_REGISTRY_VERSION &&
    version <= REGISTRY_VERSION
  );
}
