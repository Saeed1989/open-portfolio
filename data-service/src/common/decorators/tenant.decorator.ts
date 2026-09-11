import { createParamDecorator, NotImplementedException } from '@nestjs/common';

/** The tenant an admin request acts for (FR-TEN-4). */
export interface TenantScope {
  readonly userId: string;
  readonly portfolioId: string;
}

/**
 * The one place admin scope is resolved. It comes from the session, never from
 * a path, body or query parameter (FR-API-3).
 */
export const Tenant = createParamDecorator((): TenantScope => {
  // TODO: return the scope SessionGuard attaches to the request.
  throw new NotImplementedException();
});
