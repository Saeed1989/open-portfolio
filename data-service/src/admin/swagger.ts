import { ApiHeaderOptions } from '@nestjs/swagger';

/**
 * The header every admin request carries, documented as a parameter so it is
 * editable on the endpoint being tested. `UserIdGuard` reads it.
 */

/** Says which tenant the caller speaks for (FR-TEN-4, FR-EDGE-4). */
export const USER_ID_HEADER: ApiHeaderOptions = {
  name: 'X-User-Id',
  required: true,
  description:
    'User id injected by gateway after session resolution. Set manually in local dev only.',
};
