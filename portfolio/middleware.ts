import { NextResponse, type NextRequest } from 'next/server';
import { isValidSlug, resolveSlugFromHost, SLUG_HEADER } from '@/lib/tenant';

/**
 * Resolves the tenant from the Host header and forwards it on
 * `x-portfolio-slug` (FR-TEN-1, FR-TEN-2).
 *
 * A request whose host carries no usable label — the apex domain, a reserved
 * label such as `api` or `admin`, a malformed one — is forwarded *without* the
 * header. The container then renders the branded 404 (FR-TEN-3). Rejecting
 * here with a bare 404 response would skip app/not-found.tsx and produce a
 * different body for reserved labels than for unknown ones, which is exactly
 * the disclosure that requirement forbids.
 *
 * The inbound header is deleted before ours is set. Without that, a visitor
 * could send `x-portfolio-slug: someone-else` and be served another tenant.
 */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);

  /* Tenancy comes from Host, never from the client. */
  headers.delete(SLUG_HEADER);

  const slug = resolveSlug(request);
  if (slug) headers.set(SLUG_HEADER, slug);

  return NextResponse.next({ request: { headers } });
}

function resolveSlug(request: NextRequest): string | null {
  /*
   * Development only: TENANT_SOURCE=env names the tenant outright via DEV_SLUG,
   * so localhost:3000 serves one tenant at the root with no subdomain. Guarded
   * by NODE_ENV, so it cannot pin a production deployment to one tenant —
   * there, FR-TEN-2 holds and the Host header alone decides.
   */
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.TENANT_SOURCE?.trim().toLowerCase() === 'env'
  ) {
    const devSlug = process.env.DEV_SLUG?.trim().toLowerCase();
    return devSlug && isValidSlug(devSlug) ? devSlug : null;
  }

  return resolveSlugFromHost(request.headers.get('host'));
}

export const config = {
  /*
   * Everything except build output, the internal revalidation endpoint, and
   * static files. Those neither need a tenant nor should pay for one.
   */
  matcher: [
    '/((?!_next/static|_next/image|api/internal|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
  ],
};
