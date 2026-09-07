/**
 * The registry's version (FR-REG-4).
 *
 * A portfolio records the version it was authored against (`registryVersion`,
 * SRS §5.2) so that a later registry cannot retroactively invalidate content
 * that was valid when it was written.
 *
 * **The compatibility rule.** A bump is *additive only*: a new section type, a
 * new optional field, new help text, a new enum option. None of those can make
 * an older document invalid, because validation is driven by what a document
 * contains, not by what the registry now offers — an absent section type is a
 * section the tenant has not enabled, and an absent optional field is absent.
 * A document at any supported version therefore still validates and still
 * publishes against this one.
 *
 * A change that could fail an older document — removing a field, making an
 * optional one required, narrowing an enum, tightening a bound — is not a bump
 * and is not covered by this constant. It needs a migration, and the version a
 * portfolio carries is what tells the migration which documents to touch.
 *
 * History:
 *   1  The twelve types of SRS v0.1.
 *   2  Adds `trainings` (SRS v0.2 §4.1, FR-SEC-TRN-1). Purely additive: a
 *      portfolio at version 1 has no `trainings` entry in its sections array,
 *      which reads as disabled everywhere that matters.
 */
export const REGISTRY_VERSION = 2;

/** The oldest version this registry can still read without a migration. */
export const MIN_SUPPORTED_REGISTRY_VERSION = 1;

/**
 * True when a portfolio authored at `version` can be validated, rendered and
 * published against this registry as it stands.
 *
 * Every version from `MIN_SUPPORTED_REGISTRY_VERSION` up to the current one
 * qualifies, because every bump between them was additive. A version from the
 * future does not: it may carry a section type or a field this build has never
 * heard of. The public render path is deliberately more forgiving than this —
 * SectionRenderer drops a type it does not know rather than refusing the page
 * — but a *write* path has no such luxury and should not silently re-save a
 * document it only partly understands.
 */
export function isSupportedRegistryVersion(version: unknown): boolean {
  return (
    typeof version === 'number' &&
    Number.isInteger(version) &&
    version >= MIN_SUPPORTED_REGISTRY_VERSION &&
    version <= REGISTRY_VERSION
  );
}
