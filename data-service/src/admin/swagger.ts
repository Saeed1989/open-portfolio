import { ApiHeaderOptions } from '@nestjs/swagger';

/**
 * The two headers every admin request carries, documented as parameters so
 * both are editable on the endpoint being tested. `ApiKeyGuard` reads them
 * together: neither is accepted without the other.
 */

/** Proves the caller is `edge` (FR-AUTH-12). */
export const API_KEY_HEADER: ApiHeaderOptions = {
  name: 'X-Api-Key',
  required: true,
  description:
    'Shared secret proving the request came from the edge proxy. Set manually in local dev only.',
};

/** Says which tenant the caller speaks for (FR-TEN-4, FR-EDGE-4). */
export const USER_ID_HEADER: ApiHeaderOptions = {
  name: 'X-User-Id',
  required: true,
  description:
    'User id injected by edge proxy after session resolution. Set manually in local dev only.',
};
