/*
 * The seed tenants, for the dev server only.
 *
 * Deliberately outside `src/`. Nothing the bundle can reach may know a user
 * id: direct mode's whole safety argument is that identity is injected by the
 * proxy and is not something client code can choose, and a table in `src/`
 * would be one import away from becoming a tenant switcher in the UI.
 *
 * The ids are the seed's, which is deterministic by construction — readable
 * rather than arbitrary, and identical on every machine:
 *
 *   5eed000000000000 01 01 0001
 *   ^seed            ^  ^  ^sequence
 *                    |  ^tenant: 01 alice, 02 bob, 03 carol, 04 dave
 *                    ^kind: 01 user
 *
 * `src/mocks/tenants.ts` holds the same ids for MSW. They are duplicated on
 * purpose: that file is a browser fixture and this one must never be
 * importable from the browser, so sharing a module between them would defeat
 * the separation this file exists to keep. `npm run seed` in data-service is
 * the source both copy from.
 */

export const DEV_TENANTS = {
  /** Published, every Must section complete — the happy path. */
  alice: '5eed00000000000001010001',
  /** A second real tenant, for cross-tenant isolation. */
  bob: '5eed00000000000001020001',
  /** Draft only, deliberately incomplete — publish validation fails on it. */
  carol: '5eed00000000000001030001',
  /** Suspended, with a published tree. */
  dave: '5eed00000000000001040001',
} as const;

export type DevTenantName = keyof typeof DEV_TENANTS;

export const DEV_TENANT_NAMES = Object.keys(DEV_TENANTS) as DevTenantName[];

/** The only shape `users._id` serialises to — the same check `api`'s guard runs. */
const USER_ID = /^[0-9a-f]{24}$/i;

export interface ResolvedTenant {
  readonly userId: string;
  /** Where the id came from, for the startup banner. */
  readonly source: string;
}

/**
 * Resolves the tenant the dev proxy will act as.
 *
 * `DEV_USER_ID` wins over `DEV_TENANT`, so an id that is not one of the four
 * — a tenant created by hand against a local database — needs no change here.
 * Returns null rather than throwing; the caller decides whether a missing
 * tenant is fatal, and it only is in direct mode.
 */
export function resolveDevTenant(env: Record<string, string>): ResolvedTenant | null {
  const explicit = env.DEV_USER_ID?.trim();
  if (explicit) {
    if (!USER_ID.test(explicit)) {
      throw new Error(
        `DEV_USER_ID="${explicit}" is not a 24-character hex ObjectId. ` +
          "api's admin guard rejects anything else with a 401.",
      );
    }
    return { userId: explicit, source: 'DEV_USER_ID' };
  }

  const name = env.DEV_TENANT?.trim();
  if (!name) return null;

  if (!(name in DEV_TENANTS)) {
    throw new Error(
      `DEV_TENANT="${name}" is not a seed tenant. ` +
        `Use one of ${DEV_TENANT_NAMES.join(', ')}, or set DEV_USER_ID directly.`,
    );
  }

  return {
    userId: DEV_TENANTS[name as DevTenantName],
    source: `DEV_TENANT=${name}`,
  };
}
