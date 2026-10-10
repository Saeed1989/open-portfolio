export const SIGN_IN_PATH = '/sign-in';

/**
 * Sends the tenant to sign-in with a full navigation rather than a route
 * change, so everything this page held about the previous session — the query
 * cache, unsaved form state — goes with the document.
 */
export function goToSignIn(): void {
  window.location.assign(SIGN_IN_PATH);
}
