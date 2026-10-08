export interface AuthConfig {
  readonly googleClientId: string;
  readonly googleClientSecret: string;
  readonly googleRedirectUri: string;
  /** `kid` → key bytes. One or two entries: the current key and the previous. */
  readonly jwtKeys: ReadonlyMap<string, Uint8Array>;
  readonly jwtCurrentKid: string;
}

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');

type Env = (name: string) => string | undefined;

const BASE64URL = /^[A-Za-z0-9_-]+$/;

/**
 * Reads and validates the auth environment. Called while `AuthModule` is
 * instantiated, so a violation refuses the boot (FR-AUTH-19). Messages name
 * the variable and the rule, never a value.
 */
export function loadAuthConfig(env: Env): AuthConfig {
  const required = (name: string): string => {
    const value = env(name);
    if (!value) throw new Error(`${name} is not set.`);
    return value;
  };

  const googleRedirectUri = required('GOOGLE_REDIRECT_URI');
  if (!URL.canParse(googleRedirectUri)) {
    throw new Error('GOOGLE_REDIRECT_URI is not a URL.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(required('AUTH_JWT_KEYS'));
  } catch {
    throw new Error('AUTH_JWT_KEYS is not JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('AUTH_JWT_KEYS must be a JSON object mapping kid to key.');
  }

  const entries = Object.entries(parsed);
  if (entries.length < 1 || entries.length > 2) {
    throw new Error('AUTH_JWT_KEYS must hold one or two keys.');
  }

  const jwtKeys = new Map<string, Uint8Array>();
  for (const [kid, key] of entries) {
    if (typeof key !== 'string' || !BASE64URL.test(key)) {
      throw new Error(`AUTH_JWT_KEYS: key "${kid}" is not base64url.`);
    }
    const bytes = Buffer.from(key, 'base64url');
    /* RFC 7518 §3.2: an HS256 key is at least as long as the hash output. */
    if (bytes.length < 32) {
      throw new Error(`AUTH_JWT_KEYS: key "${kid}" is shorter than 256 bits.`);
    }
    jwtKeys.set(kid, bytes);
  }

  const jwtCurrentKid = required('AUTH_JWT_CURRENT_KID');
  if (!jwtKeys.has(jwtCurrentKid)) {
    throw new Error('AUTH_JWT_CURRENT_KID names no key in AUTH_JWT_KEYS.');
  }

  return {
    googleClientId: required('GOOGLE_CLIENT_ID'),
    googleClientSecret: required('GOOGLE_CLIENT_SECRET'),
    googleRedirectUri,
    jwtKeys,
    jwtCurrentKid,
  };
}
