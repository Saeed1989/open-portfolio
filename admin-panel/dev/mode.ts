import { resolveDevTenant, type ResolvedTenant } from './tenants';

/*
 * How the dev server reaches `api`, resolved once at startup.
 *
 * Dev-server only, like its neighbour: none of this is imported from `src/`,
 * and none of the variables it reads is `VITE_`-prefixed, so none of them can
 * be compiled into a bundle.
 */

export type AdminDevMode = 'mock' | 'direct' | 'edge';

export const ADMIN_DEV_MODES: readonly AdminDevMode[] = ['mock', 'direct', 'edge'];

export interface DirectConfig {
  readonly mode: 'direct';
  /** Where `api` is listening, e.g. http://127.0.0.1:3000. */
  readonly apiUrl: string;
  /**
   * `api`'s existing admin key — the same secret `edge` presents as
   * `X-Api-Key`. Direct mode uses it rather than inventing a second one,
   * because `api`'s admin guard already accepts exactly this pair:
   * `X-Api-Key` proves the caller, `X-User-Id` names the tenant. That makes
   * direct mode "what `edge` does, minus the identity subrequest", and needs
   * no change to `api` at all.
   */
  readonly apiKey: string;
  readonly tenant: ResolvedTenant;
}

export type DevModeConfig =
  | { readonly mode: 'mock' }
  | { readonly mode: 'edge' }
  | DirectConfig;

/** Thrown at dev-server start, naming exactly what is missing. */
export class DevModeConfigError extends Error {
  constructor(missing: readonly string[]) {
    super(
      `ADMIN_DEV_MODE=direct needs ${missing.join(', ')}.\n` +
        'Copy .env.example to .env.local and fill it in. ' +
        'These are not VITE_-prefixed, so they stay out of the bundle — ' +
        'the dev server injects them into proxied requests instead.',
    );
    this.name = 'DevModeConfigError';
  }
}

function readMode(raw: string | undefined): AdminDevMode {
  const value = raw?.trim();
  /* mock is the default so that a clone with no .env.local starts and works
     offline, which is what M0 established. */
  if (!value) return 'mock';
  if ((ADMIN_DEV_MODES as readonly string[]).includes(value)) {
    return value as AdminDevMode;
  }
  throw new Error(
    `ADMIN_DEV_MODE="${value}" is not one of ${ADMIN_DEV_MODES.join(', ')}.`,
  );
}

/**
 * Reads the mode and everything it needs, failing at startup rather than on
 * the first request.
 *
 * A dev server that starts in direct mode with no key would serve a page that
 * 401s on every call, which reads as an app bug. Naming the missing variable
 * before the server binds is the whole point.
 */
export function resolveDevMode(env: Record<string, string>): DevModeConfig {
  const mode = readMode(env.ADMIN_DEV_MODE);
  if (mode !== 'direct') return { mode };

  const apiUrl = env.API_URL?.trim();
  const apiKey = env.ADMIN_API_KEY?.trim();
  const tenant = resolveDevTenant(env);

  const missing: string[] = [];
  if (!apiUrl) missing.push('API_URL');
  if (!apiKey) missing.push('ADMIN_API_KEY');
  if (!tenant) missing.push('DEV_TENANT (or DEV_USER_ID)');
  if (missing.length > 0) throw new DevModeConfigError(missing);

  return {
    mode: 'direct',
    apiUrl: apiUrl as string,
    apiKey: apiKey as string,
    tenant: tenant as ResolvedTenant,
  };
}

/** One line at startup, so the mode and tenant are never a guess. */
export function describeDevMode(config: DevModeConfig): string {
  switch (config.mode) {
    case 'mock':
      return 'admin dev mode: mock — MSW in the browser, api is not called.';
    case 'edge':
      return (
        'admin dev mode: edge — no Vite proxy. Serve the build through ' +
        '../edge and open the admin host, not this port.'
      );
    case 'direct':
      return (
        `admin dev mode: direct — /api/admin/* → ${config.apiUrl}/admin/*, ` +
        `acting as ${config.tenant.source} (${config.tenant.userId}). ` +
        'Identity is injected by the proxy; the browser cannot change it.'
      );
  }
}
