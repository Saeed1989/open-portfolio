/**
 * The fixed allowlist of post-sign-in paths within the admin origin
 * (FR-AUTH-15). The first entry is the default.
 */
export const POST_LOGIN_PATHS: readonly string[] = ['/'];

/**
 * A `returnTo` is kept only if it is a relative path — no scheme, no
 * authority, no leading `//` — and its path is on the allowlist (FR-AUTH-15).
 * Backslashes and control characters are refused too, since browsers read
 * `/\host` as `//host`.
 */
export function validReturnTo(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (/[\\\x00-\x1f\x7f]/.test(value)) return null;

  const path = value.split(/[?#]/, 1)[0];
  return POST_LOGIN_PATHS.includes(path) ? value : null;
}
