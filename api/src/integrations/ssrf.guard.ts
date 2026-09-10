import * as dns from 'dns';

const resolve4 = dns.promises.resolve4;
const resolve6 = dns.promises.resolve6;

export class SsrfError extends Error {
  constructor(url: string, reason?: string) {
    super(`SSRF protection blocked URL: ${url}${reason ? ` (${reason})` : ''}`);
    this.name = 'SsrfError';
  }
}

/**
 * Returns true if the given IPv4 address falls within a private or reserved range:
 *   10.0.0.0/8       — private
 *   172.16.0.0/12    — private
 *   192.168.0.0/16   — private
 *   127.0.0.0/8      — loopback
 *   169.254.0.0/16   — link-local
 */
function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;                        // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true;           // 192.168.0.0/16
  if (a === 127) return true;                        // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true;           // 169.254.0.0/16 link-local
  return false;
}

/**
 * Returns true if the given IPv6 address falls within a private or reserved range:
 *   ::1          — loopback
 *   fc00::/7     — unique local (fc00:: – fdff::)
 *   fe80::/10    — link-local
 */
function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (lower === '::1') return true; // loopback
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7
  // fe80::/10 covers fe80–febf
  if (
    lower.startsWith('fe8') ||
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb')
  ) {
    return true;
  }
  return false;
}

/**
 * Resolves all IPv4 and IPv6 addresses for a hostname and throws SsrfError
 * if any resolved address falls within a private or reserved range.
 * If the DNS resolution itself fails for a particular record type (e.g. the host
 * is IPv4-only and has no AAAA record), that failure is silently ignored —
 * only a SsrfError from a confirmed private address is re-thrown.
 */
async function resolveAndCheck(hostname: string): Promise<void> {
  // IPv4
  try {
    const ipv4s = await resolve4(hostname);
    for (const ip of ipv4s) {
      if (isPrivateIpv4(ip)) {
        throw new SsrfError(hostname, `resolves to private IPv4: ${ip}`);
      }
    }
  } catch (err) {
    if (err instanceof SsrfError) throw err;
    // NODATA / NOTFOUND for A records is acceptable; host may be IPv6-only
  }

  // IPv6
  try {
    const ipv6s = await resolve6(hostname);
    for (const ip of ipv6s) {
      if (isPrivateIpv6(ip)) {
        throw new SsrfError(hostname, `resolves to private IPv6: ${ip}`);
      }
    }
  } catch (err) {
    if (err instanceof SsrfError) throw err;
    // NODATA / NOTFOUND for AAAA records is acceptable; host may be IPv4-only
  }
}

/**
 * Validates that a URL is safe to fetch:
 *   1. Must be a well-formed URL.
 *   2. Protocol must be http: or https:.
 *   3. Resolved DNS addresses must not fall in any private/reserved range.
 *
 * Throws SsrfError on any violation.
 */
export async function assertSafeUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SsrfError(url, 'malformed URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new SsrfError(url, `disallowed protocol: ${parsed.protocol}`);
  }

  await resolveAndCheck(parsed.hostname);
}

const MAX_REDIRECTS = 10;

/**
 * SSRF-safe drop-in wrapper for `fetch`.
 *
 * Before every request (including each redirect hop) the target URL is validated
 * by `assertSafeUrl`. Redirects are followed manually so that each `Location`
 * header is re-checked before the next request is made, preventing open-redirect
 * attacks that could land on a private host.
 *
 * Relative `Location` values are resolved against the current request URL.
 * Throws SsrfError if any hop resolves to a private address or if the redirect
 * chain exceeds MAX_REDIRECTS.
 */
export async function safeFetch(
  url: string,
  options?: RequestInit,
  _redirectCount = 0,
): Promise<Response> {
  if (_redirectCount > MAX_REDIRECTS) {
    throw new SsrfError(url, 'too many redirects');
  }

  await assertSafeUrl(url);

  const response = await fetch(url, { ...options, redirect: 'manual' });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (!location) {
      throw new SsrfError(url, 'redirect with no Location header');
    }
    // Resolve relative redirects against the current URL before re-validating
    const resolved = new URL(location, url).toString();
    return safeFetch(resolved, options, _redirectCount + 1);
  }

  return response;
}
