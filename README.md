# open-portfolio

A multi-tenant portfolio generator. Anyone signs in with GitHub or Google, configures their
portfolio through an admin panel, and publishes it at `{slug}.openfolio.site` — no code required.

## Specs

| File | Contents |
|---|---|
| [`spec/BusinessRequirements.md`](spec/BusinessRequirements.md) | The content model — what a portfolio holds, prioritised Must/Should/Could |
| [`spec/srs.md`](spec/srs.md) | The system spec — architecture, data model, `FR-*`/`NFR-*` requirements, traceability |
| [`spec/architecture.md`](spec/architecture.md) | One-page map — components, topology, flows. Derived from the SRS |
| [`spec/adminRequestFlow.md`](spec/adminRequestFlow.md) | Sequence diagram for the authenticated admin request |

`spec/srs.md` is the source of truth. The other two are derived from it; where one disagrees, the
SRS wins and the derived file is wrong.

## Architecture

| Component | Tech | Exposure |
|---|---|---|
| `gateway` | Node.js, TypeScript, Fastify — a small in-house service | its own hostname (the admin route, reached through the admin host) and `api.openfolio.site` — terminates TLS, routes by host and path, resolves identity by subrequest, authenticates to `api` with an API key |
| `api` | NestJS | may be publicly reachable — public, admin, and auth surfaces plus a scheduled `sync` module; `/auth/*` and `/admin/*` answer only to `gateway`'s API key |
| `admin` | Next.js | `admin.openfolio.site` — OAuth session required |
| `portfolio` | Next.js SSR/ISR | `*.openfolio.site` wildcard — fully public |
| `www` | Static SPA | `openfolio.site` apex — marketing site, fully public |
| `db` | MongoDB | internal |
| `redis-cache` | Redis, `allkeys-lru` | internal |
| `storage` | S3-compatible, CDN-fronted | signed writes, public read |
| `packages/registry` | TypeScript library | not deployed — consumed by `api`, `admin`, `portfolio` |

The three API surfaces — public, admin, and auth — use separate controllers, guards, and
DTOs, and share none. `gateway` resolves the session by subrequest to the auth surface and injects
the user id as an `X-User-Id` header; admin scope always comes from that header — never from
a request parameter. `api` trusts the header only on a request carrying the API key `gateway`
alone holds, not because of where `api` runs. `sync` is not a fourth surface and not a separate deployable: nothing
addresses it over HTTP, and it runs in `api` so it reaches the provider token in-process.

## Core ideas

- **Section registry.** Thirteen section types (`hero`, `projects`, `skills`, `contact`,
  `experience`, `education`, `blog`, `testimonials`, `opensource`, `speaking`, `achievements`,
  `trainings`, `gallery`) are declared once in a registry shared by all three apps. Admin
  generates its forms from it, the API validates against it, and the public site takes field
  render order from it. A new section type = one registry entry + one React component.
- **Draft / published.** Each portfolio holds two content trees. Admin writes `draft`; the public
  surface reads `published` only. Publish validates the draft and builds the render payload once,
  stores it in the shape it is served in, and triggers on-demand revalidation — so a page view is
  one database read and no transformation.
- **Nothing renders empty.** Every section toggles independently, and an enabled-but-empty section
  is omitted entirely — no headings, no empty states.
- **Integrations never block a render.** GitHub and RSS data is refreshed by `api`'s scheduled
  `sync` module into a cache, then folded into the published tree. A page render makes zero
  external calls; a failed sync leaves the live page serving the last good data unchanged.
  Every synced field is manually editable, and manual values win.
- **Guardrails, not suggestions.** The 3–5 project cap, the 5–8 prominent-skill count, required
  alt text, and WCAG AA accent-colour contrast are enforced by the API, not advised in the UI.

## Running locally

There is no root workspace: each folder installs and runs on its own. You need Node.js 22 and a
MongoDB instance (`data-service/docker-compose.yml` starts one on `27017`, or point
`MONGODB_URI` at any other).

This is the quick setup, on `localhost` over plain HTTP. It exercises sign-in and the admin
panel end to end. The topology NFR-OPS-6 asks for — real hostnames and a trusted certificate —
is described in [`gateway/README.md`](gateway/README.md).

```
Browser ──► admin host ─┬─ /*      ──► the admin SPA
                        └─ /api/*  ──► http://gateway.localhost:8080

admin host ──► gateway :8080 ─┬─ /api/auth/*  ──► api 127.0.0.1:3001 /auth/*
                              └─ /api/admin/* ──► api /auth/resolve ──► api /admin/*
```

### 1. Registry — `packages/registry`

Built once, and again after any change to it. The other apps consume its `dist/`.

```
cd packages/registry
npm install
npm run build
```

`data-service` and `portfolio` take the registry from their own `vendor/registry`. After a
registry change, run `npm run vendor:registry && npm install` in each.

### 2. `api` — `data-service`

```
cd data-service
npm install
cp .env.example .env
```

Set in `.env`:

| Variable | Value |
|---|---|
| `MONGODB_URI` | your MongoDB, e.g. `mongodb://localhost:27017/portfolio` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | a Google OAuth client (web application) |
| `GOOGLE_REDIRECT_URI` | `http://localhost:5174/api/auth/google/callback` — the admin host (step 3) |
| `AUTH_JWT_KEYS` | `{"k1":"<key>"}` — generate the key with the command in `.env.example` |
| `AUTH_JWT_CURRENT_KID` | `k1` |
| `GATEWAY_API_KEYS` | `["<key>"]` — a second key, generated the same way; `gateway` gets the same value in step 4 |

Register the same redirect URI on the Google OAuth client, under "Authorised redirect URIs".

```
npm run seed          # optional: the fixture tenants
npm run start:dev     # binds 127.0.0.1:3001
```

`api` listens on loopback by default and is reached through `gateway`; `/auth/*` and `/admin/*`
answer `401` to a request without the API key, wherever it comes from. Swagger is at
`http://127.0.0.1:3001/docs/admin`, `/docs/auth` and `/docs/public`.

### 3. `admin` — `admin-panel`

```
cd admin-panel
npm install
npm run build
```

The admin SPA is served by the admin host, which also forwards `/api/*` to `gateway` unchanged
(SRS FR-EDGE-9); `gateway` serves no page. In development the admin host is the admin dev server:
`npm run dev`.

```
cp .env.example .env.local    # GATEWAY_ORIGIN=http://gateway.localhost:8080
npm run dev                   # http://localhost:5174
```

Because the browser is on the admin host, `GOOGLE_REDIRECT_URI` in step 2 is
`http://localhost:5174/api/auth/google/callback`, not `gateway`'s address.

### 4. `gateway`

```
cd gateway
npm install
cp .env.example .env
```

Change in `.env`, leaving both `TLS_*` paths empty:

```
GATEWAY_ADMIN_HOST=gateway.localhost
PUBLIC_READ_HOST=api.localhost
PORT=8080
TRUSTED_PROXY_CIDRS=127.0.0.1
GATEWAY_API_KEY=<the key in GATEWAY_API_KEYS of data-service/.env>
```

```
npm run dev
```

### 5. Open the admin panel

At the admin host's address, `http://localhost:5174` — not at `gateway`'s, which answers `404`
outside `/api/*`. With no session it lands on `/sign-in`; after Google sign-in it
lands on the dashboard, or on the slug claim screen for an account with no portfolio.

### 6. `portfolio` and `www`, when needed

```
cd portfolio
npm install
cp .env.example .env.local    # then set PORTFOLIO_BASE_DOMAIN=localhost
npm run dev                   # http://alice.localhost:3000
```

With `USE_FIXTURES=true` it renders from `fixtures/` and needs nothing else running. To read
from `api` instead, set `USE_FIXTURES=false` and `PORTFOLIO_API_URL` to the public-read host
through `gateway` (`http://api.localhost:8080`).

```
cd landing-page
npm install
npm run dev
```

### Checks

| Folder | Commands |
|---|---|
| `admin-panel` | `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e` |
| `data-service` | `npm run typecheck`, `npm run lint`, `npm run test:e2e` |
| `gateway` | `npm run typecheck`, `npm test` |
| `portfolio` | `npm run typecheck`, `npm test` |
