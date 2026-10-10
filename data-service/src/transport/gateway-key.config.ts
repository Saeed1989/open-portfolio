export const GATEWAY_KEYS = Symbol('GATEWAY_KEYS');

type Env = (name: string) => string | undefined;

const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** The keys of `AUTH_JWT_KEYS`, as far as they can be read; auth validates them. */
function jwtKeys(env: Env): string[] {
  try {
    const parsed: unknown = JSON.parse(env('AUTH_JWT_KEYS') ?? '');
    return typeof parsed === 'object' && parsed !== null
      ? Object.values(parsed).filter((key) => typeof key === 'string')
      : [];
  } catch {
    return [];
  }
}

/**
 * Reads and validates the keys `gateway` may present (FR-EDGE-8): one, or two
 * during a rotation. Called while `TransportModule` is instantiated, so a
 * violation refuses the boot. Messages name the variable and the rule, never
 * a value.
 */
export function loadGatewayKeys(env: Env): readonly string[] {
  const raw = env('GATEWAY_API_KEYS');
  if (!raw) throw new Error('GATEWAY_API_KEYS is not set.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('GATEWAY_API_KEYS is not JSON.');
  }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 2) {
    throw new Error(
      'GATEWAY_API_KEYS must be a JSON array of one or two keys.',
    );
  }

  const keys: string[] = [];
  for (const key of parsed) {
    if (typeof key !== 'string' || !BASE64URL.test(key)) {
      throw new Error('GATEWAY_API_KEYS: a key is not base64url.');
    }
    if (Buffer.from(key, 'base64url').length < 32) {
      throw new Error('GATEWAY_API_KEYS: a key is shorter than 256 bits.');
    }
    keys.push(key);
  }

  /* FR-EDGE-8: the key is used for nothing else. */
  const signing = jwtKeys(env).map((key) => Buffer.from(key, 'base64url'));
  for (const key of keys) {
    const bytes = Buffer.from(key, 'base64url');
    if (signing.some((other) => other.equals(bytes))) {
      throw new Error('GATEWAY_API_KEYS: a key is also an AUTH_JWT_KEYS key.');
    }
  }

  return keys;
}
