export const AUTH_PROVIDERS = ['github', 'google'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

/** What `GET /admin/me` shows of an account. `providerId` and `status` stay inside auth. */
export interface AccountDisplayFields {
  readonly provider: AuthProvider;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
}

/**
 * The declared in-process interface of FR-AUTH-17: the only route by which a
 * module outside `src/auth` reaches `users` or `sessions`. This file and
 * `auth.module.ts` are the only auth paths the ESLint zone lets another
 * surface import.
 */
export interface AccountAccess {
  /** Null when no such user exists. */
  getDisplayFields(userId: string): Promise<AccountDisplayFields | null>;

  /** Revokes every live session of the user (FR-AUTH-13, FR-AUTH-14). */
  revokeAllForUser(userId: string): Promise<void>;
}

export const ACCOUNT_ACCESS = Symbol('ACCOUNT_ACCESS');
