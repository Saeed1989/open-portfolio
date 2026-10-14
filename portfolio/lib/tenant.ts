/**
 * Host → slug resolution. Dependency-free and side-effect-free, so middleware
 * can import it into the edge runtime.
 *
 * Tenant identity for a public request derives solely from the Host header:
 * nothing here reads a query parameter, cookie or client-supplied header.
 * This is the only place in the app that parses a Host header for a tenant.
 */

/** The header middleware sets for the container to read. */
export const SLUG_HEADER = 'x-portfolio-slug';

/**
 * Reserved labels, plus `preview` and `styleguide`, which are routes in this
 * app and so cannot also be tenants. The operator's infrastructure hostnames
 * are deployment configuration and are not listed here.
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
 * `alice.openfolio.site` → `alice`, for base domain `openfolio.site`.
 * Anything that is not exactly `{label}.{PORTFOLIO_BASE_DOMAIN}` —
 * the apex, another domain, a nested subdomain, a reserved or malformed label —
 * is null, and all of those render the same 404.
 *
 * Set PORTFOLIO_BASE_DOMAIN=localhost to test
 * `alice.localhost:3000` locally.
 */
export function resolveSlugFromHost(host: string | null): string | null {
  const baseDomain = process.env.PORTFOLIO_BASE_DOMAIN?.trim().toLowerCase();
  if (!baseDomain) throw new Error('PORTFOLIO_BASE_DOMAIN is not set.');

  if (!host) return null;

  const hostname = host.trim().toLowerCase().replace(/:\d+$/, '');
  const suffix = `.${baseDomain}`;
  if (!hostname.endsWith(suffix)) return null;

  /* A nested subdomain leaves a dot in the label, which isValidSlug rejects. */
  const label = hostname.slice(0, -suffix.length);
  return isValidSlug(label) ? label : null;
}
