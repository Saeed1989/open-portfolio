import { MEDIA_HOST } from '../ids';
import type { SeedAccount } from '../tenant';

/*
 * Signed in, no portfolio: the onboarding path. `GET /admin/me`
 * answers `portfolio: null`, and every admin route but the onboarding ones
 * answers `404 portfolio_not_found` until eve claims a slug.
 *
 * Deliberately has no row in `portfolios`. A test that creates one mutates
 * the fixture, so reseed after it.
 */
export const eve: SeedAccount = {
  name: 'eve',
  user: {
    provider: 'google',
    providerId: '100000000000000006006',
    email: 'eve@example.net',
    displayName: 'Eve Martin',
    avatarUrl: `${MEDIA_HOST}/eve/avatar.png`,
    status: 'active',
  },
};
