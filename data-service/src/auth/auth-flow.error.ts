/**
 * A sign-in failure the browser may learn the code of, as
 * `?auth_error=<code>`. Nothing from the provider is carried.
 */
export type AuthErrorCode =
  | 'invalid_state'
  | 'provider_error'
  | 'email_unverified'
  | 'suspended'
  | 'server_error'
  | 'Q15_UNRESOLVED';

export class AuthFlowError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
  }
}

/**
 * Q15 undecided: a sign-in whose email already belongs to another identity.
 * Link, refuse, or allow duplicates — open question 15 has not chosen.
 */
export function resolveEmailCollision(): never {
  throw new AuthFlowError('Q15_UNRESOLVED');
}
