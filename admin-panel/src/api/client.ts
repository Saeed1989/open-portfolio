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
import { goToSignIn } from '../auth/navigation';
import { AdminError, parseError } from './errors';
import { preconditionHeaders } from './precondition';

/*
 * The one place this app speaks to the server.
 *
 * Every path is same-origin and relative (D0). The access cookie is scoped
 * `Path=/api` and the refresh cookie `Path=/api/auth`, both host-only
 * (FR-AUTH-3), so the browser attaches them to these calls and to nothing
 * else this app serves — which is exactly why `credentials: 'same-origin'` is
 * enough, no token is held in JS, and neither cookie is ever read here.
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

async function send(path: string, init: RequestInit_): Promise<Response> {
  try {
    return await fetch(path, {
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
}

async function read<T>(response: Response): Promise<T> {
  if (!response.ok) throw await parseError(response);

  /* 204 carries no body: logout, and the deletes of §7.2. */
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

/** The one refresh in flight on this page, shared by every 401 that arrives
 *  while it is (FR-AUTH-20). Within the page only — tabs do not coordinate
 *  (open question 17). */
let refreshing: Promise<boolean> | null = null;

/**
 * `POST /api/auth/refresh` (FR-AUTH-18). Resolves true when the cookies were
 * re-set and the original request is worth retrying.
 *
 * A `401` means the session is over: the tenant is sent to sign-in, and the
 * promise is left pending so no caller renders an error on a page that is
 * being left. Any other failure resolves false, and the caller reports its
 * original `401`.
 */
function refreshSession(): Promise<boolean> {
  refreshing ??= send('/api/auth/refresh', { method: 'POST' })
    .then(
      (response) => {
        if (response.status !== 401) return response.ok;
        goToSignIn();
        return new Promise<boolean>(() => undefined);
      },
      () => false,
    )
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * A request under FR-AUTH-20: on a `401`, refresh once and retry once. The
 * retry's answer is final — a second `401` is reported, not refreshed again.
 */
async function call<T>(path: string, init: RequestInit_ = {}): Promise<T> {
  let response = await send(path, init);
  if (response.status === 401 && (await refreshSession())) {
    response = await send(path, init);
  }
  return read<T>(response);
}

export const adminApi = {
  me: (signal?: AbortSignal) => call<Me>(`${ADMIN}/me`, { signal }),

  slugAvailability: (slug: string, signal?: AbortSignal) =>
    call<SlugAvailabilityResult>(
      `${ADMIN}/slug-availability?slug=${encodeURIComponent(slug)}`,
      { signal },
    ),

  /** `preset` is omitted while the registry has one; `api` defaults it. */
  createPortfolio: (body: { slug: string; name?: string }) =>
    call<AdminPortfolio>(`${ADMIN}/portfolio`, { method: 'POST', body }),

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

/** §7.4. Not on the admin prefix. */
export const authApi = {
  /* Answers 204 whether or not a session was found (FR-AUTH-14), so it is
     sent once and never refreshed. */
  logout: async () =>
    read<undefined>(await send('/api/auth/logout', { method: 'POST' })),
  /* Verifies the access JWT, so it can 401 and takes the refresh-and-retry
     of FR-AUTH-20 like an admin request. */
  logoutAll: () =>
    call<undefined>('/api/auth/logout-all', { method: 'POST' }),
} as const;
