import type { Me } from '../api/dto';

/*
 * The four seed tenants, as the admin surface would return them.
 *
 * Identity, ids and status are transcribed from `data-service/src/seed` so
 * that a screen developed against these handlers meets the same values when it
 * is pointed at a seeded database. The seed is deterministic by design — its
 * ids are readable rather than arbitrary — which is what makes copying them
 * here safe rather than a second set of fixtures that will drift.
 *
 *   5eed000000000000 01 01 0001
 *   ^seed            ^  ^  ^sequence
 *                    |  ^tenant: 01 alice, 02 bob, 03 carol, 04 dave
 *                    ^kind: 01 user
 *
 * What each one is for:
 *   alice  the happy path — published, every Must section complete
 *   bob    a second real tenant, so cross-tenant isolation has genuine ids
 *   carol  draft only, deliberately incomplete — publish validation has
 *          something real to fail on (FR-PUB-6)
 *   dave   suspended, with a published tree, so the suspension path is
 *          exercised rather than the no-content path (FR-TEN-3)
 */

export type TenantName = 'alice' | 'bob' | 'carol' | 'dave';

export const TENANT_NAMES: readonly TenantName[] = [
  'alice',
  'bob',
  'carol',
  'dave',
];

export interface MockTenant {
  readonly userId: string;
  readonly me: Me;
}

export const TENANTS: Record<TenantName, MockTenant> = {
  alice: {
    userId: '5eed00000000000001010001',
    me: {
      provider: 'github',
      email: 'alice@example.com',
      displayName: 'Alice Nakamura',
      avatarUrl: 'https://placeholder.invalid/alice/avatar.png',
      portfolio: { slug: 'alice', status: 'published' },
    },
  },
  bob: {
    userId: '5eed00000000000001020001',
    me: {
      provider: 'google',
      email: 'bob@example.net',
      displayName: 'Bob Ferreira',
      avatarUrl: 'https://placeholder.invalid/bob/avatar.jpg',
      portfolio: { slug: 'bob', status: 'published' },
    },
  },
  carol: {
    userId: '5eed00000000000001030001',
    me: {
      provider: 'github',
      email: 'carol@example.org',
      displayName: 'Carol Adeyemi',
      avatarUrl: 'https://placeholder.invalid/carol/avatar.png',
      portfolio: { slug: 'carol', status: 'unpublished' },
    },
  },
  dave: {
    userId: '5eed00000000000001040001',
    me: {
      provider: 'google',
      email: 'dave@example.co',
      displayName: 'Dave Lindqvist',
      avatarUrl: 'https://placeholder.invalid/dave/avatar.png',
      portfolio: { slug: 'dave', status: 'suspended' },
    },
  },
};

/**
 * A fifth identity: authenticated, no portfolio.
 *
 * Not a seed tenant — the seed has none, because every fixture it holds is a
 * portfolio. FR-AUTH-7 branches on exactly this case, so the handlers have to
 * be able to produce it.
 */
export const NO_PORTFOLIO: MockTenant = {
  userId: '5eed00000000000001050001',
  me: {
    provider: 'github',
    email: 'erin@example.com',
    displayName: 'Erin Okonkwo',
    portfolio: null,
  },
};
