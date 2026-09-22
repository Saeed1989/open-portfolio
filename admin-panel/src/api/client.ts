import type {
  AdminPortfolio,
  AdminSeo,
  AdminTheme,
  Integration,
  LinkHealth,
  Me,
  PublishResult,
  SlugAvailabilityResult,
  UploadUrl,
} from './dto';
import { AdminError, parseError } from './errors';
import { preconditionHeaders } from './precondition';

/*
 * The one place this app speaks to the server.
 *
 * Every path is same-origin and relative (D0). The session cookie is scoped
 * `Path=/api`, host-only (FR-AUTH-3), so the browser attaches it to these
 * calls and to nothing else this app serves — which is exactly why
 * `credentials: 'same-origin'` is enough and no token is held in JS.
 *
 * No identity is sent. `X-User-Id` is `edge`'s to set, unconditionally, on
 * every location it proxies (FR-EDGE-4); a value from here would be
 * overwritten, and sending one would suggest it were trusted.
 */

const ADMIN = '/api/admin';

interface RequestInit_ {
  readonly method?: string;
  readonly body?: unknown;
  readonly signal?: AbortSignal | undefined;
  /** D3: the document version this write was composed against. */
  readonly ifMatch?: number | undefined;
}

async function call<T>(path: string, init: RequestInit_ = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method ?? 'GET',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(init.body === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...preconditionHeaders(init.ifMatch),
      },
      ...(init.body === undefined
        ? {}
        : { body: JSON.stringify(init.body) }),
      ...(init.signal ? { signal: init.signal } : {}),
    });
  } catch (cause) {
    /* The request never reached a server. Distinct from a 5xx, because
       retrying is reasonable here and reporting a server fault is not. */
    throw new AdminError({
      kind: 'network',
      status: 0,
      message:
        cause instanceof Error ? cause.message : 'The request did not complete',
    });
  }

  if (!response.ok) throw await parseError(response);

  /* 204 carries no body: logout, and the deletes of §7.2. */
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

export const adminApi = {
  me: (signal?: AbortSignal) => call<Me>(`${ADMIN}/me`, { signal }),

  slugAvailability: (slug: string, signal?: AbortSignal) =>
    call<SlugAvailabilityResult>(
      `${ADMIN}/slug-availability?slug=${encodeURIComponent(slug)}`,
      { signal },
    ),

  createPortfolio: (body: {
    name: string;
    slug: string;
    preset: string;
  }) => call<AdminPortfolio>(`${ADMIN}/portfolio`, { method: 'POST', body }),

  portfolio: (signal?: AbortSignal) =>
    call<AdminPortfolio>(`${ADMIN}/portfolio`, { signal }),

  /**
   * Replace a section's content, toggle it, or reorder it (§7.2).
   *
   * One PATCH per section, which is what makes D2's per-section save machine
   * possible: two sections edited in one sitting are two independent writes
   * with independent failure states.
   */
  updateSection: (
    type: string,
    body: { content?: unknown; enabled?: boolean; order?: number },
    ifMatch: number | undefined,
    signal?: AbortSignal,
  ) =>
    call<AdminPortfolio>(
      `${ADMIN}/portfolio/sections/${encodeURIComponent(type)}`,
      { method: 'PATCH', body, ifMatch, signal },
    ),

  updateTheme: (body: AdminTheme) =>
    call<AdminPortfolio>(`${ADMIN}/portfolio/theme`, { method: 'PATCH', body }),

  updateSeo: (body: AdminSeo) =>
    call<AdminPortfolio>(`${ADMIN}/portfolio/seo`, { method: 'PATCH', body }),

  updateSlug: (slug: string) =>
    call<AdminPortfolio>(`${ADMIN}/portfolio/slug`, {
      method: 'PATCH',
      body: { slug },
    }),

  integrations: (signal?: AbortSignal) =>
    call<readonly Integration[]>(`${ADMIN}/integrations`, { signal }),

  syncIntegration: (provider: string) =>
    call<Integration>(
      `${ADMIN}/integrations/${encodeURIComponent(provider)}/sync`,
      { method: 'POST' },
    ),

  uploadUrl: (body: { mimeType: string; bytes: number; altText: string }) =>
    call<UploadUrl>(`${ADMIN}/media/upload-url`, { method: 'POST', body }),

  publish: () => call<PublishResult>(`${ADMIN}/publish`, { method: 'POST' }),

  linkHealth: (signal?: AbortSignal) =>
    call<readonly LinkHealth[]>(`${ADMIN}/link-health`, { signal }),
} as const;

/** `POST /api/auth/logout` (§7.4). Not on the admin prefix. */
export const authApi = {
  logout: () => call<undefined>('/api/auth/logout', { method: 'POST' }),
  logoutAll: () =>
    call<undefined>('/api/auth/logout-all', { method: 'POST' }),
} as const;
