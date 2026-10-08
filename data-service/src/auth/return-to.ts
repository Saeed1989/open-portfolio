/**
 * FR-AUTH-15: the fixed allowlist of post-callback redirect targets. Every
 * entry is a relative path within the admin origin — no scheme, no authority,
 * no leading `//` — and a `returnTo` is honoured only on an exact match, so
 * no user-supplied URL is ever redirected to.
 */
export const RETURN_TO_ALLOWLIST: readonly string[] = [
  '/',
  '/sections',
  '/onboarding/slug',
];

export const DEFAULT_RETURN_TO = '/';

export function resolveReturnTo(candidate: unknown): string {
  return typeof candidate === 'string' &&
    RETURN_TO_ALLOWLIST.includes(candidate)
    ? candidate
    : DEFAULT_RETURN_TO;
}
