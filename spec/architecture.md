# Architecture

Derived from `srs.md` v0.8. On conflict, the SRS wins.

Multi-tenant portfolio SaaS. One portfolio per tenant at `{slug}.openfolio.site`. Admin edits `draft`; publish builds the render payload once and stores it; public pages serve it unchanged.

## Components

| Component | Tech | Host |
|---|---|---|
| `edge` | Node.js, TypeScript, Fastify — `apps/edge` | `admin.openfolio.site`, `api.openfolio.site` |
| `api` | NestJS — modules `public`, `admin`, `auth`, `sync` | private |
| `admin` | React SPA, client-rendered; static build | `admin.openfolio.site`, served by `edge` |
| `portfolio` | Next.js SSR + ISR on Vercel | `*.openfolio.site`, not through `edge` |
| `www` | static SPA | `openfolio.site` |
| `db` | MongoDB | private |
| `redis-cache` | Redis (`allkeys-lru`) | private |
| `storage` | S3-compatible + CDN | public read, signed write |
| `packages/registry` | TS library, used by `api`, `admin`, `portfolio` | — |

`sync` is the scheduled worker of SRS §3, a set of cron jobs rather than a fourth HTTP surface — nothing addresses it. It is not a deployable of its own: running in `api`'s process is what lets it reach the decrypted provider token through the in-process interface of FR-AUTH-17.

## Topology

```
Browser ──► edge ─┬─ admin.  /api/auth/*     ──► api /auth/*
                  ├─ admin.  /api/admin/*    ──► api /auth/resolve ──► api /admin/*
                  └─ admin.  /*              ──► admin SPA build (static files)

Browser ──► openfolio.site                   ──► www
Browser ──► *.openfolio.site                 ──► portfolio (Vercel)
portfolio ──► edge ── api.  GET /public/*    ──► api /public/*

api ──► db, redis-cache, GitHub/Google OAuth, portfolio /internal/revalidate
api ──► GitHub API, RSS feeds  (sync module only, SSRF-guarded)
Browser ──► storage (signed upload, media), GitHub cards, Credly (embeds)
```

`api` has no public ingress; only `edge` and internal services reach it. `edge` is a small service in the monorepo, not nginx, and fronts two hosts: the admin host, and the public-read host `api.openfolio.site`, which exposes `/public/*` only and exists because `portfolio` runs outside the deployment network. The apex and the tenant wildcard do not resolve to `edge`. `admin` is static files with no server of its own.

## Flows

**Page view** — browser → `portfolio` on Vercel. ISR hit: serve. Miss: `GET https://api.openfolio.site/public/portfolios/:slug` → `edge` → `api` → one `portfolios` find → render.

**Admin request** — `edge` → HTTP `GET` to `api`'s `/auth/resolve` (session cookie, `Path=/api`, host-only). `401` → stop. `204` → `edge` sets `X-User-Id` (always overwrites) → `/admin/*`, every query scoped to that user's portfolio. Full sequence: [`adminRequestFlow.md`](adminRequestFlow.md).

**Sign-in** — `/api/auth/{github|google}/start` → provider → `/callback` → upsert user → session token (hash stored in `sessions`) → cookie → redirect to admin.

**Publish** — `/admin/publish` → registry validates + builds `{config, data}` from draft and cached integration payloads → stored in `portfolios.published` → `api` calls `portfolio /internal/revalidate` (shared secret).

**Sync** — scheduled job in `api`'s `sync` module fetches GitHub/RSS (SSRF-guarded) → writes `integrationCache` → if the payload changed, rebuilds `published.config` and `published.data` from `published.source` and the cached payloads, in one write conditional on the `version` it read and retried on mismatch, then revalidates. The fold never reads `draft`. Failure writes nothing to `portfolios` and leaves live data unchanged.

**Media** — `/admin/media/upload-url` → signed URL → browser uploads to `storage`.

**Embeds** — GitHub stat cards and Credly badges are stored as URLs/ids and fetched by the browser, not the server.
