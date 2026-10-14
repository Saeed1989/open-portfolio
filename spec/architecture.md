# Architecture

Derived from `srs.md` v0.14. On conflict, the SRS wins.

Multi-tenant portfolio SaaS. One portfolio per tenant at `{slug}.openfolio.site`. Admin edits `draft`; publish builds the render payload once and stores it; public pages serve it unchanged.

## Components

| Component | Tech | Host |
|---|---|---|
| `gateway` | Node.js, TypeScript, Fastify — `apps/gateway` | its own hostname (`GATEWAY_ADMIN_HOST`, the admin route) and `api.openfolio.site` (public read) |
| `api` | NestJS — module trees `public`, `admin`, `auth`, plus a `sync` module | may be publicly reachable; no requirement on network placement |
| `admin` | React SPA, client-rendered, Tailwind CSS; static build | `admin.openfolio.site`, its own static host (the **admin host**), which proxies `/api/*` to `gateway` |
| `portfolio` | Next.js SSR + ISR on Vercel | `*.openfolio.site`, not through `gateway` |
| `www` | static client-rendered SPA | `openfolio.site` |
| `db` | MongoDB | internal |
| `redis-cache` | Redis (`allkeys-lru`) | internal; present and unused (SRS §10.3 Q16) |
| `storage` | S3-compatible + CDN | public read, signed write |
| `packages/registry` | TS library, dual ESM/CJS — descriptors, validation, sanitiser allowlist, render-tree builder | not deployed; used by `api`, `admin`, `portfolio` |

`sync` is the scheduled worker of SRS §3, a set of jobs rather than a fourth HTTP surface. It is not a deployable of its own, and it holds no schedule in process: which connections are due lives in `integrationConnections`, and each run is started by an external scheduler calling `POST /internal/sync` (FR-INT-16). Running in `api`'s process is what lets it reach account data through the in-process interface of FR-AUTH-17 and share the publish code path for the fold of FR-INT-15.

## Topology

```
Browser ──► admin host ─┬─ /*      ──► admin SPA build (static files, index.html fallback)
  admin.openfolio.site  └─ /api/*  ──► gateway, on GATEWAY_ADMIN_HOST, unchanged

gateway (admin route) ─┬─ /api/auth/resolve ──► 404
                       ├─ /api/auth/*       ──► api /auth/*      (no identity subrequest)
                       ├─ /api/admin/*      ──► api /auth/resolve ──► api /admin/*
                       └─ anything else     ──► 404

Browser ──► openfolio.site                  ──► www
Browser ──► *.openfolio.site                ──► portfolio (Vercel)
portfolio ──► gateway (api.openfolio.site) ── GET, HEAD /public/* ──► api /public/*

scheduler ──► api POST /internal/sync       (sync trigger secret; not routed by gateway)

api ──► db, Google OAuth, portfolio /internal/revalidate
api ──► GitHub API, RSS feeds  (sync module only, SSRF-guarded)
Browser ──► storage (signed upload, media), GitHub cards, Credly (embeds)
```

`gateway` serves no page. It matches `Host` exactly against its two hostnames and closes the connection on any other; it does path routing, the identity subrequest, header overwrite, API key attachment, rate limiting, and request ids, and nothing else (FR-EDGE-1, 2, 7). `admin.openfolio.site`, the apex, and the tenant wildcard do not resolve to it.

**Trust is an API key, not network placement.** `gateway` sets `X-Api-Key` and `X-User-Id` on every request it sends to `api`, overwriting any inbound value (FR-EDGE-4). `api` answers `401` to any `/auth/*` or `/admin/*` request without a valid key, before any guard or database access, and ignores `X-User-Id` without one (FR-EDGE-5). `/public/*` needs no key. The admin host is a pass-through that holds no secret and no session (FR-EDGE-9).

## Flows

**Page view** — browser → `portfolio` on Vercel. ISR hit: serve. Miss: `GET https://api.openfolio.site/public/portfolios/:slug` → `gateway` → `api` → one `portfolios` find projecting `published.config` and `published.data` → render. No third-party call during a render.

**Admin request** — browser → admin host → `gateway` → HTTP `GET` to `api`'s `/auth/resolve`, carrying the inbound `Cookie`, `X-Request-Id`, and the API key. The auth module verifies the access JWT (HS256) and reads no collection. `401` or `403` → propagated, stop; any other failure → `502`. `204` → `gateway` sets `X-User-Id` (always overwrites) and the API key → `/admin/*`, every query scoped to that user's portfolio. On a `401` the admin app refreshes once and retries once (FR-AUTH-20). Full sequence: [`adminRequestFlow.md`](adminRequestFlow.md).

**Sign-in** — Google only in v1. `/api/auth/google/start` → `state`, PKCE verifier, and `nonce` in a cookie at `Path=/api/auth` → Google → `/api/auth/google/callback` → `state` verified, code exchanged, ID token validated → upsert user → refresh token minted (SHA-256 hash stored in `sessions`) and access JWT signed → two host-only cookies: `of_at` (access JWT, `Path=/api`, 15 minutes) and `of_rt` (refresh token, `Path=/api/auth`) → redirect to admin. No Google token is stored and no portfolio is created.

**Refresh** — `POST /api/auth/refresh` rotates the refresh token and issues a new access JWT. A token matching the session's previous hash is reuse and revokes the session. Revocation takes effect at the next refresh, so an issued access JWT stays valid for up to 15 minutes.

**Draft write** — `/admin/portfolio/sections/:type` with `If-Match: <draftRevision>` → registry validates shape, type, and enumeration → one update conditional on that revision, which increments `draftRevision`. A stale or absent `If-Match` → `409 stale_write`.

**Publish** — `/admin/publish` → registry validates the draft, reporting every failure → registry builder produces `{config, data}` from the draft and cached integration payloads → stored with `source` in `portfolios.published` in one write, with `publishedAt` set, `version` incremented, and `publishedDraftRevision` set to the draft revision read → `api` calls `portfolio /internal/revalidate` (shared secret). The draft holds unpublished changes while `draftRevision` and `publishedDraftRevision` differ.

**Sync** — external scheduler → `POST /internal/sync` (bearer secret, at most every 15 minutes) → the `sync` module claims due connections by lease, fetches GitHub/RSS (SSRF-guarded) → writes `integrationCache` → if the payload changed, rebuilds `published.config` and `published.data` from `published.source` and the cached payloads, in one write conditional on the `version` it read and retried on mismatch, then revalidates. The fold never reads `draft` and does not touch `publishedDraftRevision`. Failure writes nothing to `portfolios` and leaves live data unchanged.

**Media** — `/admin/media/upload-url` → signed URL → browser uploads to `storage`.

**Embeds** — GitHub stat cards and Credly badges are stored as URLs/ids and fetched by the browser, not the server.
