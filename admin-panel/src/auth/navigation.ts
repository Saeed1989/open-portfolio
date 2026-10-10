export const SIGN_IN_PATH = '/sign-in';

/**
 * A `returnTo` worth handing to `/api/auth/google/start`, or null. `api`
 * decides what is honoured (FR-AUTH-15); this only keeps anything that is not
 * a path on this origin from being sent at all: one leading `/`, and no `//`
 * or `\` anywhere, which between them leave no room for a scheme or an
 * authority.
 */
export function safeReturnTo(candidate: string | null): string | null {
  if (candidate === null) return null;
  if (!candidate.startsWith('/')) return null;
  if (candidate.includes('//') || candidate.includes('\\')) return null;
  return candidate;
}

/** `/sign-in`, carrying `returnTo` when it survives `safeReturnTo`. */
export function signInUrl(returnTo: string | null = null): string {
  const safe = safeReturnTo(returnTo);
  return safe === null
    ? SIGN_IN_PATH
    : `${SIGN_IN_PATH}?returnTo=${encodeURIComponent(safe)}`;
}

/**
 * Sends the tenant to sign-in with a full navigation rather than a route
 * change, so everything this page held about the previous session — the query
 * cache, unsaved form state — goes with the document.
 */
export function goToSignIn(returnTo: string | null = null): void {
  window.location.assign(signInUrl(returnTo));
}
