import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** The tenant an admin request acts for. */
export interface TenantScope {
  readonly userId: string;

  /**
   * Null when the tenant has no portfolio yet. Every route except
   * `GET /admin/me`, `GET /admin/slug-availability` and
   * `POST /admin/portfolio` answers `404 portfolio_not_found` then.
   */
  readonly portfolioId: string | null;
}

/* Declared here rather than imported from the admin guard: `common` is shared
   by every surface and may not depend on one. */
type ScopedRequest = TenantScope;

/**
 * The one place admin scope is resolved. It comes from the session, never from
 * a path, body or query parameter.
 */
export const Tenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantScope => {
    const { userId, portfolioId } = context
      .switchToHttp()
      .getRequest<ScopedRequest>();
    return { userId, portfolioId };
  },
);
