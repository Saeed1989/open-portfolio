import { NextResponse, type NextRequest } from 'next/server';
import {
  isLoopbackHost,
  isValidSlug,
  resolveHost,
  SLUG_HEADER,
} from '@/lib/tenant';

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
  const host = request.headers.get('host');
  const resolution = resolveHost(host);

  if (resolution.kind === 'slug') return resolution.slug;

  /*
   * A label that was present and rejected — `admin.site.com`, a malformed one —
   * stops here. It must never reach the fallback below, or a reserved label
   * would serve a portfolio in development.
   */
  if (resolution.kind === 'rejected') return null;

  /*
   * Development only: `localhost:3000` carries no tenant label, so DEV_SLUG
   * names the fixture to serve. It is a fallback, not an override —
   * `alice.localhost` still resolves to `alice`, so multi-tenant behaviour
   * stays testable. Restricted to loopback hosts and guarded by NODE_ENV, so
   * it cannot influence a production deployment even if the variable is set.
   */
  if (process.env.NODE_ENV !== 'production' && isLoopbackHost(host)) {
    const devSlug = process.env.DEV_SLUG?.trim().toLowerCase();
    if (devSlug && isValidSlug(devSlug)) return devSlug;
  }

  return null;
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
