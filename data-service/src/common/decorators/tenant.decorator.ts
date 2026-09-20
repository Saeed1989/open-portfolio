import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** The tenant an admin request acts for (FR-TEN-4). */
export interface TenantScope {
  readonly userId: string;

  /**
   * Null when the tenant has no portfolio yet. Every route except
   * `GET /admin/me`, `GET /admin/slug-availability` and
   * `POST /admin/portfolio` answers `404 portfolio_not_found` then (§7.2).
   */
  readonly portfolioId: string | null;
}

/* Declared here rather than imported from the admin guard: `common` is shared
   by every surface and may not depend on one (§2.1). */
type ScopedRequest = TenantScope;

/**
 * The one place admin scope is resolved. It comes from the session, never from
 * a path, body or query parameter (FR-API-3).
 */
export const Tenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantScope => {
    const { userId, portfolioId } = context
      .switchToHttp()
      .getRequest<ScopedRequest>();
    return { userId, portfolioId };
  },
);
