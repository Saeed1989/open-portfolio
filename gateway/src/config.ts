import { readFileSync } from 'node:fs';
import { isIP } from 'node:net';

export interface RateLimit {
  max: number;
  windowMs: number;
}

export interface Config {
  /** The hostname of the admin route — `gateway`'s own, not the admin host's. */
  adminRouteHost: string;
  publicReadHost: string;
  /** Origin `api` is reached at, e.g. `http://10.0.0.5:3001`. */
  apiUpstream: string;
  /** Sent to `api` as `X-Api-Key` on every request (FR-EDGE-4, FR-EDGE-8). */
  apiKey: string;
  port: number;
  /** Null when a load balancer terminates TLS instead (SRS §10.3 Q24). */
  tls: { cert: Buffer; key: Buffer } | null;
  /** The only peers `X-Forwarded-For` is believed from (FR-EDGE-10). Empty: none. */
  trustedProxyCidrs: string[];
  rateLimits: {
    /** `/api/auth/google/start` and `/callback` (FR-AUTH-16). */
    oauth: RateLimit;
    /** Every other `/api/auth/*` path (FR-AUTH-16). */
    auth: RateLimit;
    /** The public-read host (SRS §10.3 Q23). */
    publicRead: RateLimit;
  };
}

const HOSTNAME = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

function isCidr(value: string): boolean {
  const [address = '', prefix, ...rest] = value.split('/');
  const family = isIP(address);
  if (family === 0 || rest.length > 0) return false;
  if (prefix === undefined) return true;
  return /^\d+$/.test(prefix) && Number(prefix) <= (family === 4 ? 32 : 128);
}

/**
 * Reads and validates every variable `gateway` takes (FR-EDGE-6). Throws one
 * error naming every problem, so a misconfigured deploy fails at boot and
 * says everything that is wrong with it at once.
 */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const errors: string[] = [];

  const required = (name: string): string => {
    const value = env[name]?.trim() ?? '';
    if (value === '') errors.push(`${name} is required`);
    return value;
  };

  const integer = (name: string, min: number, max: number): number => {
    const value = required(name);
    const parsed = /^\d+$/.test(value) ? Number(value) : NaN;
    if (value !== '' && !(parsed >= min && parsed <= max)) {
      errors.push(`${name} must be an integer from ${min} to ${max}`);
    }
    return parsed;
  };

  const hostname = (name: string): string => {
    const value = required(name).toLowerCase();
    if (value !== '' && !HOSTNAME.test(value)) {
      errors.push(`${name} must be a bare hostname, with no scheme or port`);
    }
    return value;
  };

  const rateLimit = (name: string): RateLimit => ({
    max: integer(`RATE_LIMIT_${name}_MAX`, 1, Number.MAX_SAFE_INTEGER),
    windowMs: integer(
      `RATE_LIMIT_${name}_WINDOW_MS`,
      1,
      Number.MAX_SAFE_INTEGER,
    ),
  });

  const adminRouteHost = hostname('GATEWAY_ADMIN_HOST');
  const publicReadHost = hostname('PUBLIC_READ_HOST');
  if (adminRouteHost !== '' && adminRouteHost === publicReadHost) {
    errors.push('GATEWAY_ADMIN_HOST and PUBLIC_READ_HOST must differ');
  }

  let apiUpstream = required('API_UPSTREAM');
  if (apiUpstream !== '') {
    const url = URL.canParse(apiUpstream) ? new URL(apiUpstream) : null;
    if (
      url === null ||
      !['http:', 'https:'].includes(url.protocol) ||
      url.pathname !== '/' ||
      url.search !== '' ||
      url.username !== ''
    ) {
      errors.push('API_UPSTREAM must be an http(s) origin with no path');
    } else {
      apiUpstream = url.origin;
    }
  }

  /* FR-EDGE-8. The message names the rule, never the value. */
  const apiKey = required('GATEWAY_API_KEY');
  if (
    apiKey !== '' &&
    (!BASE64URL.test(apiKey) || Buffer.from(apiKey, 'base64url').length < 32)
  ) {
    errors.push('GATEWAY_API_KEY must be base64url of at least 256 bits');
  }

  const port = integer('PORT', 1, 65535);

  const certPath = env.TLS_CERT_PATH?.trim() ?? '';
  const keyPath = env.TLS_KEY_PATH?.trim() ?? '';
  let tls: Config['tls'] = null;
  if ((certPath === '') !== (keyPath === '')) {
    errors.push('TLS_CERT_PATH and TLS_KEY_PATH must be set together');
  } else if (certPath !== '') {
    try {
      tls = { cert: readFileSync(certPath), key: readFileSync(keyPath) };
    } catch (error) {
      errors.push(`TLS material is unreadable: ${(error as Error).message}`);
    }
  }

  const trustedProxyCidrs = (env.TRUSTED_PROXY_CIDRS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  for (const entry of trustedProxyCidrs) {
    if (!isCidr(entry)) {
      errors.push(`TRUSTED_PROXY_CIDRS: "${entry}" is not an address or CIDR`);
    }
  }
  const rateLimits = {
    oauth: rateLimit('OAUTH'),
    auth: rateLimit('AUTH'),
    publicRead: rateLimit('PUBLIC'),
  };

  if (errors.length > 0) {
    throw new Error(`Invalid gateway configuration:\n- ${errors.join('\n- ')}`);
  }

  return {
    adminRouteHost,
    publicReadHost,
    apiUpstream,
    apiKey,
    port,
    tls,
    trustedProxyCidrs,
    rateLimits,
  };
}
