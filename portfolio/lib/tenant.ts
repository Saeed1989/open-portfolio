/**
 * Host → slug resolution. Deliberately dependency-free and side-effect-free so
 * middleware can import it into the edge runtime.
 *
 * FR-TEN-2: tenant identity for a public request derives solely from the Host
 * header. Nothing here reads a query parameter, a cookie, or a client-supplied
 * header, and middleware strips any inbound `x-portfolio-slug` before setting
 * its own — a visitor cannot ask to be served as another tenant.
 */

/** The header middleware sets for the container to read. */
export const SLUG_HEADER = 'x-portfolio-slug';

/**
 * FR-DAT-1. The spec's list (SRS §5.2) plus `preview` and `styleguide`, which
 * are routes in this app and so cannot also be tenants.
 *
 * The requirement's "plus any label matching the operator's infrastructure
 * hostnames" is deployment configuration, not a constant — it belongs in an
 * env-supplied addition once those hostnames exist.
 */
export const RESERVED_LABELS: ReadonlySet<string> = new Set([
  'www',
  'api',
  'admin',
  'app',
  'mail',
  'static',
  'cdn',
  'assets',
  'status',
  'blog',
  'help',
  'support',
  'docs',
  'preview',
  'styleguide',
]);

/** A DNS label: lowercase alphanumeric and hyphens, not leading or trailing. */
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function isValidSlug(candidate: string): boolean {
  return SLUG_PATTERN.test(candidate) && !RESERVED_LABELS.has(candidate);
}

/**
 * What a Host header resolved to.
 *
 * `rejected` and `noLabel` are kept apart on purpose. Both produce the same
 * 404 for a visitor, but they must not be treated alike internally: the
 * development DEV_SLUG fallback applies only to a host that carries no tenant
 * label at all. Collapsing them would let `admin.localhost` fall through to
 * the fallback and serve a portfolio from a reserved label.
 */
export type HostResolution =
  | { readonly kind: 'slug'; readonly slug: string }
  /** A label was present and is not usable — reserved, or malformed. */
  | { readonly kind: 'rejected' }
  /** The apex domain, a bare `localhost`, or an IP address. */
  | { readonly kind: 'noLabel' };

const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/** Hosts that carry no tenant and may use the development fallback. */
export function isLoopbackHost(host: string | null): boolean {
  if (!host) return false;
  const hostname = host.split(':')[0].trim().toLowerCase();
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

/**
 * `alice.site.com` → `alice`. The apex `site.com` and a bare `localhost` carry
 * no tenant label. `alice.localhost` is recognised so local multi-tenant
 * testing needs no hosts-file edit.
 */
export function resolveHost(host: string | null): HostResolution {
  if (!host) return { kind: 'noLabel' };

  const hostname = host.split(':')[0].trim().toLowerCase();
  if (!hostname) return { kind: 'noLabel' };

  /* `127.0.0.1` splits into four labels and would otherwise yield the slug
     `127`. An address is never a tenant. */
  if (IPV4.test(hostname) || hostname.startsWith('[')) {
    return { kind: 'noLabel' };
  }

  const labels = hostname.split('.');
  const hasTenantLabel =
    labels.length >= 3 || (labels.length === 2 && labels[1] === 'localhost');

  if (!hasTenantLabel) return { kind: 'noLabel' };

  const label = labels[0];
  return isValidSlug(label) ? { kind: 'slug', slug: label } : { kind: 'rejected' };
}
