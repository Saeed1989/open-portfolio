export const SIGN_IN_PATH = '/sign-in';

/**
 * Sends the tenant to sign-in with a full navigation rather than a route
 * change, so everything this page held about the previous session — the query
 * cache, unsaved form state — goes with the document.
 *
 * No `returnTo` is carried: how one reaches `/api/auth/google/start`, and
 * which paths are honoured, is not decided (SRS open question 28).
 */
export function goToSignIn(): void {
  window.location.assign(SIGN_IN_PATH);
}
