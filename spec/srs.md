# Software Requirements Specification — Portfolio Generator

**Version** 0.17 (draft) · **Date** 14 October 2026
**Source** `portfolio-website-requirements.md` (business requirements, v1)

---

## 1. Introduction

### 1.1 Purpose

The business requirements document describes the content model for *one* engineer's portfolio site. This specification translates that content model into a **multi-tenant portfolio generator**: a hosted system in which any registered user configures and publishes their own portfolio through an admin panel, without writing code.

Where the business document says "the owner decides X at launch", this specification reads it as "the system exposes X as per-tenant configuration".

### 1.2 Scope

**In scope (v1)**

- Multi-tenant account creation via OAuth
- Admin panel for content authoring, section toggling, and theming
- Server-rendered public portfolio at `{slug}.openfolio.site`
- Thirteen section types, generic in structure, shipped with a software-engineering preset
- GitHub and RSS integrations with mandatory manual fallback
- Browser-embedded GitHub stat cards and Credly badges, stored as URLs rather than synced
- Draft / publish lifecycle with cache invalidation

**Out of scope (v1)**

- Custom domains (business req 17.1 deferred)
- Multiple layout templates (one layout, configurable theme)
- Team or multi-editor accounts
- Custom CSS/JS injection by tenants
- Billing, plans, quotas beyond hard system limits

### 1.3 Definitions

| Term | Meaning |
|---|---|
| **Tenant** | A registered user account. One tenant owns exactly one portfolio in v1. |
| **Portfolio** | The complete configured document for a tenant — sections, content, theme, SEO. |
| **Section** | An instance of a section type within a portfolio, with its own enabled flag, order, and content. |
| **Section type** | One of thirteen declared kinds (`hero`, `projects`, `skills`, …), defined in the section registry. |
| **Slug** | The tenant's subdomain label. `alice` → `alice.openfolio.site`. |
| **Draft** | The working copy edited in admin. Not publicly visible. |
| **Published** | The immutable-until-next-publish copy served to the public. |
| **Preset** | A named starting configuration — which sections are enabled, with what defaults. |

### 1.4 Requirement identifiers

Software requirements use the form `FR-<GROUP>-<n>` and `NFR-<GROUP>-<n>`. Business requirements are referenced by their original identifiers (`2.9`, `18.2`, …).

Priority follows the source document: **Must** = launch blocker, **Should** = v1 if capacity allows, **Could** = post-launch. The business document assigns priority per section across §1–§12 and per row only in §13, so a section's rating is inherited by every requirement drawn from it. Where a single requirement is deliberately scoped below its section's blanket rating — FR-SEC-PROJ-7, 8 and 9, and FR-SEC-SKILL-9 and 10 — that is this specification's judgement rather than the source document's, and is recorded here so the divergence stays visible.

**Priority attaches to the requirement, not to the feature it serves.** A requirement may outrank the section it governs, and several do: FR-INT-14 and NFR-SEC-4 are Must while `achievements` is only Should. They do not oblige the system to ship Credly badges. They bind absolutely *if* it does. Read a Must on an optional feature as conditional — not "build this before launch", but "if this ships at all, it ships this way or not at all". Security, privacy, and accessibility requirements are the usual occupants of that category, because the cost of getting them wrong does not scale down with the priority of the feature that carries them.

---

## 2. System overview

### 2.1 Deployables

| Component | Technology | Exposure | Auth |
|---|---|---|---|
| `gateway` | Node.js, TypeScript, Fastify — `apps/gateway` | Its own hostname (the admin route, reached through the admin host) and `api.openfolio.site` | Terminates TLS; resolves identity by subrequest; authenticates to `api` with the API key — see §2.6 |
| `api` | NestJS | May be publicly reachable — no requirement on network placement | Three surfaces; `/auth/*` and `/admin/*` require the API key — see below |
| `admin` | React SPA, client-rendered, Tailwind CSS; static build | `admin.openfolio.site`, its own static host, which proxies `/api/*` to `gateway` | Sign-in required — holds no session of its own; see below |
| `portfolio` | Next.js (SSR) on Vercel | `*.openfolio.site`, resolved to Vercel directly, not through `gateway` | None — fully public |
| `www` | Static client-rendered SPA | `openfolio.site` (apex) | None — fully public |
| `db` | MongoDB | Internal | — |
| `redis-cache` | Redis, `allkeys-lru` | Internal | — |
| `storage` | S3-compatible object store | CDN-fronted | Public read, signed write |

`www` is the marketing site at the apex domain and the entry point to sign-up. It is built to static files and served as built: it holds no session, makes no call to `api` or to any other service, and renders no portfolio data. Its calls to action are plain links to `admin.openfolio.site`, where sign-in and then the branch of FR-AUTH-7 take over. It is client-rendered, and whether that is sufficient is open.

`gateway` fronts `api` on two hostnames: its own, which carries the admin route, and the public-read host. It does not serve the admin build. Admin traffic reaches it through the proxy of the **admin host** — the static host that serves `admin` at `admin.openfolio.site` and forwards `/api/*`. It is a small application in the monorepo. It does host matching, path routing, the identity subrequest, header overwrite, API key attachment, rate limiting, and request ids, and nothing else. `admin.openfolio.site`, the apex (`www`), and the tenant wildcard (`portfolio` on Vercel) do not resolve to `gateway`. `api.openfolio.site` resolves to `gateway` and exposes `/public/*` only. It exists so that `portfolio` reads through one stable, rate-limited public hostname whatever `api`'s own address. `gateway`'s source is a specified artifact.

A further workspace, `packages/registry`, is a shared library rather than a deployable. It compiles to dual ESM/CJS with four entrypoints — descriptors, validation, the rich-text sanitiser configuration, and the render-tree builder — so that `api` (CJS, built with `tsc`) and `admin` and `portfolio` consume prebuilt output rather than package source. It imports no framework, no ORM, and no React, and reads no environment: descriptors are data, and validators and the builder are pure functions. Presentation belonging to a section type — icons, components, styling — lives in the consuming app, keyed by the descriptor's identifier.

A single API server hosts **three logically separate surfaces**. **The public, admin, and auth surfaces are three NestJS module trees inside the one `api` deployable, not three services.** They share a process, a database connection pool, and a release, so none can be deployed, scaled, or restarted without the others.

- **Public surface** (`/public/*`) — unauthenticated, read-only, returns published content only. The portfolio is resolved from the requested slug. Returns public-safe configuration — theme, SEO, the analytics measurement id or Plausible domain, and the ordered list of sections to render — because each of those is visible in the rendered page's source whether the API returns it or not. Never returns draft content, disabled sections, integration credentials, sync status or `lastError`, a tenant's user id, or any tenant's account email address — the address held in `users`, as distinct from a contact address the tenant chooses to publish in `contact`, which is content. That configuration never leaves the admin surface.
- **Admin surface** (`/admin/*`) — read/write. The tenant is resolved from the user id supplied by `gateway`, and the tenant's portfolio, if one exists, from the tenant — never from a request parameter. It parses no cookie, performs no session lookup, and reads neither `users` nor `sessions`.
- **Auth surface** (`/auth/*`) — sign-in, sign-out, session resolution, and account state. It is the sole holder of the OAuth client secret, and the sole reader and writer of `users` and `sessions`.

The three surfaces use separate controllers, separate guards, and separate response DTOs. No DTO is shared between them, and the separation is enforced rather than observed: ESLint `import/no-restricted-paths` zones forbid one module tree from importing another's internals, one zone per surface.

Beside the three surfaces, `api` holds a **sync module** — the sync worker of §3, refreshing each integration on the schedule of FR-INT-2 and checking demo links under FR-SEC-PROJ-9. It is a set of jobs rather than a fourth surface. Its runs are started by the trigger of FR-INT-16, and its one HTTP entry is that internal trigger (§7.3), which is not a surface, so the ESLint zones above do not gain one. It is not a deployable of its own. Which connections are due, and each one's backoff, are held in `integrationConnections` (§5.4) rather than in the process, so no long-running process and no job queue is required. It reaches the provider token of FR-AUTH-4 through the in-process interface of FR-AUTH-17, the only route into `users`. The fold of FR-INT-15 — the registry's builder, the conditional write, and the revalidation of §2.3 step 8 — runs on the same code path as a publish.

A sync job shares a process, a connection pool, and a release with the public and admin surfaces, so it is bounded by its own timeout and backoff and by the time budget of the trigger that started it, not by a process boundary.

The auth module is written to be extractable: every access to `users` or `sessions` from outside it goes through a declared in-process interface rather than a direct Mongoose call.

### 2.2 Request flow — public page view

1. Request arrives at `alice.openfolio.site`.
2. `portfolio` middleware reads the `Host` header, extracts `alice`, rejects reserved labels.
3. If a valid ISR cache entry exists for that slug, it is served. No API call, no database read.
4. Otherwise `portfolio` calls `GET https://api.openfolio.site/public/portfolios/alice` server-side. The request leaves Vercel and enters through `gateway`, which forwards only `/public/*`, with `X-User-Id` set empty and the API key attached, to `api`.
5. `api` performs one find on `portfolios`, keyed by the slug and projecting `published.config` and `published.data`, and serialises the result through the public DTO as the two-part payload of §7.1: `config` — theme, SEO, public-safe analytics, and the ordered list of sections to render — and `data`, each section's content keyed by its type. Both halves were resolved at publish (§2.3), so nothing is stripped, evaluated, or joined per request.
6. `portfolio` applies `config.theme`, `config.seo`, and `config.analytics`, then renders the layout by iterating `config.sections` in order and dispatching each entry to the component registered for its type, with `data[type]` as its content.

**The server contacts no third-party API during a page render.** Integration data it renders comes only from the copy folded into the published tree at the last successful sync or publish (§2.3, FR-INT-15), which the render reads as part of its one find.

Two features are deliberate exceptions, and they sit on the *client* side of that line. GitHub stat cards and Credly badges are stored as URLs, so the visitor's browser requests them directly from those services after the HTML has been sent *(13.6, 13.9)*. The render itself still makes no external call and caches nothing, so neither can go stale, and a slow, rate-limited, or absent third party is visible to the visitor. §6.4.6 specifies the behaviour, FR-INT-11 and FR-INT-13 the transport, and NFR-SEC-4 the content-security-policy consequence.

### 2.3 Request flow — publish

1. Tenant clicks Publish in `admin`.
2. `api` validates the draft against the section registry. Validation failures block the publish and are reported per field.
3. `api` passes the draft, with each connected provider's payload from `integrationCache`, to the registry's builder. The builder removes sections with `enabled: false` and items with `published: false` (§5.2).
4. It merges each synced payload into the section it feeds, beneath the tenant's manual values, which win. A payload marked `stale` is merged like any other: it is the last good payload, which FR-INT-3 already serves.
5. It removes every section whose merged content satisfies its `emptyCondition`. Emptiness is judged after the merge, so a section the tenant left empty but a sync has filled survives, and a section with neither is removed.
6. It emits the survivors as `config.sections` — `{ type, order }`, in ascending order — with their content in `data`, keyed by type, and copies `theme`, `seo`, and `analytics` when configured into `config`. If no section survives, the publish is refused.
7. In one write, the builder's output is stored as `published.config` and `published.data`, and the draft as it stood after step 3 as `published.source`; `publishedAt` is set, `version` incremented, and `publishedDraftRevision` set to the `draftRevision` the draft was read at (§5.2).
8. `api` calls the `portfolio` app's on-demand revalidation endpoint for that slug, using a shared secret.
9. The next public request repopulates the cache.

Everything the public read needs is decided here, once, as FR-PUB-3 generates the OG image at publish rather than per view. The tree written in step 7 is final: a render reads it and does nothing further to it.

Steps 3 to 8 also run with no tenant involved, whenever a sync brings a changed payload. The builder then starts from `published.source` rather than from the draft, step 3 has nothing left to remove, and step 7 rewrites `config` and `data` only, so a sync refreshes the integration data on the live page without publishing any edit the tenant has not. The sync worker therefore writes the document the public surface reads, and triggers regenerations of the public page.

### 2.4 Draft / publish model

The business document does not address this, but a generator needs it: a tenant must be able to leave a project half-written without it appearing live, and cache invalidation needs a discrete event to hook onto.

Every portfolio document therefore holds two content trees, `draft` and `published`. Admin reads and writes `draft` only. The public surface reads `published` only. A portfolio with no `published` tree returns 404 publicly.

### 2.5 Request flow — sign-in

1. The tenant follows the "Sign in with Google" link the admin panel renders, to `/api/auth/google/start` on `admin.openfolio.site`. The admin host forwards `/api/*` unchanged to `gateway`, which routes `/api/auth/*` to `api`'s `/auth/*` with the API key attached and without an identity subrequest. Every response on this path, its `Set-Cookie` and `Location` included, returns through the admin host untouched.
2. `api`'s auth module generates `state`, a PKCE verifier, and a `nonce`. It stores them, with an optional `returnTo`, in a cookie scoped `Path=/api/auth`, `httpOnly`, `Secure`, `SameSite=Lax`, `Max-Age=600`. It then redirects the browser to Google's authorization endpoint with `response_type=code`, `scope=openid email profile`, `code_challenge_method=S256`, `state`, `nonce`, and `prompt=select_account`. `SameSite=Lax` is required here rather than incidental: the callback arrives as a top-level cross-site GET navigation, which `Strict` would not accompany with the cookie.
3. Google returns the browser to `/api/auth/google/callback` with a code.
4. `api` verifies `state` against the cookie first, and only then exchanges the code, using the client secret, verifier, and redirect URI in one process.
5. It validates the ID token, upserts the user keyed by `(provider: 'google', providerId: sub)`, and refuses a suspended user. It stores no Google token and creates no portfolio.
6. It mints a 256-bit random refresh token, stores its SHA-256 hash in `sessions` (§5.8), signs an access JWT for the user, clears the `state` cookie, and sets both cookies of FR-AUTH-3: `httpOnly`, `Secure`, `SameSite=Lax`, host-only to `admin.openfolio.site`, the access cookie at `Path=/api` and the refresh cookie at `Path=/api/auth`.
7. It redirects the browser to the admin panel, subject to FR-AUTH-15, where FR-AUTH-7 decides what the tenant sees.

**Failure.** On a failure at any step, the auth module clears the `state` cookie and redirects to `/sign-in?error=<code>`, where `<code>` is `auth_failed` or `account_suspended`. No provider error detail appears in the URL.

GitHub sign-in is deferred; its paths are not routed.

`Path=/api` keeps both cookies from the `admin` SPA, which is served at `/` on the same host. The `__Host-` prefix requires `Path=/` and therefore is not used.

### 2.6 Request flow — authenticated admin request

1. The admin panel, a plain client, calls `/api/admin/...` on its own origin, `admin.openfolio.site`. The browser attaches the access cookie automatically, but only for `/api/*`, so a request for the admin build itself never carries it. The refresh cookie, scoped to `/api/auth`, is not sent. The admin host forwards the request unchanged, its `Cookie` header included, to `gateway` on `gateway`'s own hostname.
2. `gateway` matches the hostname of its admin route exactly, then the `/api/admin/` prefix, and calls `api`'s `GET /auth/resolve` before proxying anything. This is an HTTP request to `api`'s upstream address carrying the inbound `Cookie` and `X-Request-Id` headers, the API key, and no body.
3. The auth module checks the API key, then verifies the access JWT's signature and `exp`. It reads no collection and writes nothing.
4. Any failure is a `401`. `gateway` propagates it, and the admin surface is never called. The admin app then refreshes once and retries once.
5. Success is a `204` carrying the resolved user id in an `X-User-Id` response header.
6. `gateway` captures that header, **overwrites** any `X-User-Id` on the inbound request with it, whatever the browser or the admin host sent, sets the API key, and forwards the request to `api`'s `/admin/*`.
7. `api` rejects a request without a valid API key. Its admin guard then reads `X-User-Id`, rejects the request if it is absent or malformed, takes the tenant from it, and scopes every query by it. No cookie parsing, no session lookup, no `users` read.
8. The response streams back through `gateway`, and then through the admin host, to the browser, untouched by either.

`api` trusts `X-User-Id` only on a request carrying the API key, which `gateway` alone holds; the key authenticates `gateway` as the caller and does not re-verify the session.

The access cookie is host-only to `admin.openfolio.site`, so the admin host proxies `/api/*`, holding nothing, to `gateway` on its own hostname, and `gateway` relays admin requests to `api`.

**One owner per collection.** `users` and `sessions` belong to `api`'s auth module. The admin and public surfaces read neither, and reach account data only through the interface of FR-AUTH-17. Revocation on account deletion and on operator suspension is an in-process call into that interface.

**Per-request cost.** Resolution performs zero database reads: an HMAC verification in memory. The admin request itself then reads `portfolios` by user id. The round trip from `gateway` into `api` over a keepalive pool happens on every admin request, because `gateway` does not cache resolution results. Where the two are not on one network, it crosses whatever lies between them. NFR-PERF-5 bounds it. Once every 15 minutes of activity the admin app also spends one `POST /api/auth/refresh` — a `sessions` read and a write — plus the retried request.

**Revocation lag.** After logout on another device, logout-all, operator suspension, or account deletion, an access JWT already issued stays valid until its `exp`, at most 15 minutes; revocation stops only the refresh at once.

---

## 3. Actors

| Actor | Description |
|---|---|
| **Visitor** | Anonymous public viewer of a published portfolio. Read-only. |
| **Tenant** | Authenticated owner of exactly one portfolio. Full control over their own content, no visibility into any other tenant's. |
| **System operator** | Anthropic-side administrator. Can suspend a tenant, release a slug, and read logs. No content-editing UI in v1. |
| **Sync worker** | Scheduled job inside `api`, started by an external scheduler, performing integration refresh and demo-link health checks. |

---

## 4. The section registry

This is the central architectural decision and the thing that makes the system a *generator* rather than a hard-coded site.

Each section type is declared once, in a registry shared across all three deployables, as a descriptor containing:

- `type` — stable identifier, e.g. `projects`
- `label` and `description` — shown in admin
- `priority` — `must` / `should` / `could`, from the business document
- `cardinality` — `single` (one content object) or `collection` (an ordered array of items) with `min` / `max`
- `fields` — ordered field descriptors: key, label, data type, required, validation, help text
- `emptyCondition` — the predicate that decides whether the section counts as empty (business req 18.1)

**FR-REG-1 (Must)** — The registry is the single source of truth. `admin` generates its editing forms from it, `api` validates writes against it, `portfolio` uses it to determine field render order.

**FR-REG-2 (Must)** — Field order in the registry determines display order on the public page, identically for every item in a collection. This satisfies business req 2.11 structurally rather than by convention. Section order is not the registry's to decide: the renderer iterates `config.sections` (§7.1) for the order of sections, looks up each one's content in `data` by its type, and lays that content out in registry field order.

**FR-REG-3 (Must)** — Adding a new section type requires a registry entry plus one React component in `portfolio`. It must not require changes to `admin`, to the API's persistence layer, or to the database schema; registry changes propagate to the consuming apps by rebuild, and no consuming app requires a code change.

**FR-REG-4 (Should)** — The registry package exports a single integer, `REGISTRY_VERSION`. It is incremented by hand on any field addition, any field removal, or any change to a field's `required` flag, and is not incremented for a change to a label or help text. A portfolio records the value it was authored against (`registryVersion`, §5.2) so that field additions do not retroactively invalidate published content.

### 4.1 Declared section types

| Type | Cardinality | Priority | Business ref |
|---|---|---|---|
| `hero` | single | Must | §1 |
| `projects` | collection, 3–5 | Must | §2 |
| `skills` | collection, unbounded | Must | §3 |
| `contact` | single | Must | §4 |
| `experience` | collection | Should | §5 |
| `education` | collection | Should | §6 |
| `blog` | collection | Should | §7 |
| `testimonials` | collection, 2–4 | Should | §8 |
| `opensource` | single | Should | §9 |
| `speaking` | collection | Could | §10 |
| `achievements` | collection | Should | §11 |
| `trainings` | collection | Could | §11a |
| `gallery` | collection | Could | §12 |

Registry order is the default section order, so `trainings` ships directly after `achievements`. FR-CFG-3 applies — a tenant may reorder or disable it like any other section.

`trainings` reuses the `achievements` field schema verbatim. Per FR-REG-3 it therefore costs one registry entry and requires no schema, admin, or persistence change; the two types can be served by a single React component in `portfolio`, parameterised by label.

### 4.2 Generic structure, opinionated defaults

The business document is deliberately software-engineering-weighted — "tech stack", "repo link", "architecture diagrams". Making the system generic by stripping that specificity would produce a bland product.

**FR-REG-5 (Must)** — Section *types* and their field schemas are domain-neutral in mechanism. **FR-REG-6 (Must)** — The system ships a `software-engineer` preset that enables Hero, Projects, Skills, Contact and sets field labels, placeholder text, and skill categories (Backend, Frontend, Database, DevOps, Tools & Practices) to the source document's values. **FR-REG-7 (Could)** — Additional presets (designer, writer, researcher) reuse the same types with different labels and category defaults.

A tenant selects a preset once, on the portfolio-creation screen. It only sets initial state; everything remains editable afterwards.

**FR-REG-8 (Must)** — A field descriptor's `required` flag is enforced at publish, not at save. Draft writes validate shape, type, and enumeration only, so a tenant may save incomplete content per §2.4. `validateForPublish` additionally enforces `required`, collection `min` and `max`, and cross-field rules, and reports every failure at once per FR-PUB-6.

**FR-REG-9 (Must)** — The registry package exports a pure builder that takes a content tree in draft shape, with the synced payload of each connected provider, and returns the render shape `{ config, data }` of §7.1. It removes sections with `enabled: false` and items with `published: false`; merges each synced payload beneath the tenant's manual values; removes every section whose merged content satisfies its descriptor's `emptyCondition`; and emits the survivors as `config.sections`, in ascending `order`, with their content under `data` keyed by type. It is the only code that produces the shape. `api` calls it at publish and at each fold of synced data (§2.3, FR-INT-15), and `admin` calls it for the live preview — one function deciding for all three, so the preview cannot show a section the published page omits. It is generic over descriptors: a section type added under FR-REG-3 needs no change to it.

**FR-REG-10 (Must)** — The preset is applied at creation by the registry package, not by `api`. The package exports, beside the builder of FR-REG-9, a pure function that takes a preset id and returns the initial draft tree: one entry in `sections` per declared section type, enabled, ordered, and defaulted as the preset sets, with the preset's theme and SEO defaults and `analytics: null`. `api` calls it once, inside `POST /admin/portfolio` (§7.2), and stores its output as `draft`, with `presetId` and the current `REGISTRY_VERSION`. The reason is FR-REG-3: a preset is registry data expressed in section types, and if `api` assembled the draft from it, adding a section type or a preset would require a change to `api`. Like the builder, the function reads no environment and touches no database.

---

## 5. Data model

MongoDB. Content is heterogeneous per section type, so sections are embedded subdocuments rather than normalised tables.

### 5.1 `users`

```
_id, provider ('github'|'google'), providerId, email, displayName,
avatarUrl, createdAt, lastLoginAt, status ('active'|'suspended')
```

Unique compound index on `(provider, providerId)`. Unique index on `email`. This collection is owned solely by `api`'s auth module.

v1 writes `provider: 'google'` only. The enum keeps `github` for the deferred provider. `providerId` is the Google `sub` claim. No provider token is stored.

### 5.2 `portfolios`

```
_id, userId (unique), slug (unique, lowercase),
status ('unpublished'|'published'|'suspended'),
registryVersion, presetId,
draft:     { sections: [...], theme: {...}, seo: {...}, analytics: {...} | null },
published: { config: {...}, data: {...}, source: {...} } | null,
publishedAt, version, draftRevision, publishedDraftRevision | null,
createdAt, updatedAt
```

Each entry in `draft.sections`:

```
{ type, enabled: bool, order: int, content: <type-specific object> }
```

`analytics` is `{ provider ('plausible'|'ga'), id }`, where `id` is the Plausible domain or the Google Analytics measurement id, and is null until the tenant configures one. It sits in the content tree beside `theme` and `seo` because, like them, it reaches the public page only through a publish.

**The published tree is stored in the shape it is served in.** `published.config` and `published.data` are the two halves of the render payload (§7.1), written by the registry's builder at publish and at each fold of synced data (§2.3). The public read projects those two fields and serialises them; it transforms nothing.

The served shape cannot be rebuilt from itself. A fold of synced data has to know which values were the tenant's, so that manual values still win, and which sections were enabled but empty at publish, so that a sync which gives one content can bring it back; the build discards both. `published.source` keeps them: the draft's enabled sections as they stood at publish, with unpublished items already removed and no synced value merged in, together with the theme, SEO, and analytics published beside them. The sync worker rebuilds from `source` rather than from `draft`, because `draft` may hold edits the tenant has not published. `source` is never served, and the public read excludes it by projection.

`version` is incremented by every write to `published`, whether publish or fold; `publishedAt` changes only on publish.

`draftRevision` is the draft's concurrency token. It starts at 0 and is incremented by every write to `draft`, in the same update as the write. The admin surface returns `draftRevision` with the draft and as the `ETag` header, and a draft write must echo it in `If-Match`. The write is one update conditional on that revision; an absent or outdated `If-Match` is refused with `409 stale_write`, which carries the current `draftRevision`, and nothing is written.

`publishedDraftRevision` is the `draftRevision` the last publish read its draft at, and is null until the first publish. A publish sets it in the same write as `published` (§2.3 step 7); a fold of synced data does not touch it, since a fold publishes no edit. The draft holds unpublished changes exactly when the two differ, and `admin` offers Publish only then. The admin surface returns it with the draft and in the publish response. Neither counter is served publicly.

**Imported items carry their own publish state.** A Credly badge arrives from import unpublished and is promoted by the tenant *(11.7)*, so an achievements item additionally carries `published: bool`, independent of the portfolio-level draft/published trees. An unpublished item stays in `draft`; the builder removes it, so it reaches neither half of `published` nor its `source`. This is the only per-item publish flag in the model; it exists because the import cannot judge which badges are high-signal.

**Document size.** Media is referenced by asset id, never embedded, so a realistic content tree stays under 200 KB against MongoDB's 16 MB limit. The document holds three trees' worth of content — the draft, the published tree's served halves, and its `source` — and the served halves also carry folded integration payloads, whose unmerged originals still live in `integrationCache`: a GitHub statistics block and at most ten RSS posts. All of it together remains more than an order of magnitude below the cap.

**FR-DAT-1 (Must)** — `slug` is unique across all tenants and validated against a reserved list: `www`, `api`, `admin`, `app`, `mail`, `static`, `cdn`, `assets`, `status`, `blog`, `help`, `support`, `docs`, plus any label matching the operator's infrastructure hostnames.

**FR-DAT-2 (Should)** — A slug change preserves the old slug in a `slugHistory` array for 90 days and issues a 301 from the old subdomain.

### 5.3 `media`

```
_id, portfolioId, storageKey, url, mimeType, bytes,
width, height, altText, uploadedAt
```

Every query is scoped by `portfolioId`. Index on `portfolioId`.

### 5.4 `integrationConnections`

```
_id, portfolioId, provider ('github'|'rss'|'x'|'linkedin'),
config: { username | feedUrl | ... },
credentials: <encrypted at rest>,
status ('ok'|'failing'|'revoked'), lastSyncAt, lastError, consecutiveFailures,
nextSyncAt, leaseUntil | null
```

`nextSyncAt` holds the connection's place in the schedule. `leaseUntil` is the claim of a run in progress, and null otherwise.
GitHub stat cards and Credly badges deliberately have **no** row in this collection. Both are embedded by URL and hold no credential, no token, and no refresh schedule *(13.6, 13.9)*, so a tenant who uses only cards and badges has no `integrationConnections` document at all.

### 5.5 `integrationCache`

```
_id, portfolioId, provider, payload, fetchedAt, expiresAt, stale: bool
```

Written only by the sync worker, and not read by the public surface: a payload reaches the page folded into the published tree, and a render reads nothing here.

It is needed because the published tree holds each payload only merged beneath the tenant's manual values, and a merge cannot be undone — a publish needs the unmerged payload to merge against a newly edited draft. It has three readers. Publish folds the cached payload into the tree it builds (§2.3). The admin surface shows staleness from `fetchedAt` and `stale`, and returns the payload as input to the preview. The sync worker uses it as its working set: the last good payload, left in place when a sync fails, and the baseline a new fetch is compared against, so that an unchanged payload is never folded.

### 5.6 `linkHealth`

```
_id, portfolioId, sectionType, itemId, url,
lastCheckedAt, statusCode, state ('ok'|'broken'|'unchecked'), consecutiveFailures
```

Supports business req 2.16. A link is due for a check when its `lastCheckedAt` is more than 7 days old.

### 5.7 `auditLog`

```
_id, portfolioId, userId, action, targetPath, timestamp, ipHash
```

### 5.8 `sessions`

```
_id, tokenHash (SHA-256 of the current refresh token), previousTokenHash | null,
userId, createdAt, idleExpiresAt, absoluteExpiresAt, revokedAt | null
```

One document is one refresh-token session: a sign-in and every rotation descended from it. Access JWTs are not stored here or anywhere.

Unique index on `tokenHash`. Index on `previousTokenHash`, which is what serves reuse detection. Index on `userId`, which is what serves revoking every session for one user.

The raw refresh token is never stored: the auth module stores the hash and compares hashes. Each rotation moves `tokenHash` into `previousTokenHash` and stores the new token's hash in `tokenHash`. `idleExpiresAt` carries the 30-day idle window and is reset at each rotation; `absoluteExpiresAt` is fixed at creation, carried unchanged through every rotation, and carries the 90-day ceiling; `revokedAt` is null until the session is revoked, and a revoked session fails refresh. This collection and `users` are owned solely by `api`'s auth module; the admin and public surfaces read neither.

---

## 6. Functional requirements

### 6.1 Authentication and accounts — `FR-AUTH`

`FR-EDGE` in §6.10 specifies the routing and identity-header rules this group depends on.

| ID | Priority | Requirement |
|---|---|---|
| FR-AUTH-1 | Must | Sign-in is via Google OAuth 2.0 / OpenID Connect only in v1. GitHub sign-in is deferred. No password is stored. Any Google account with a verified email address may sign in; sign-in is not restricted to `@gmail.com`. |
| FR-AUTH-2 | Must | First successful sign-in creates a user and nothing else. It creates no portfolio and does not route to the creation screen itself; where the tenant goes next is decided by FR-AUTH-7. |
| FR-AUTH-3 | Must | `api` sets two cookies by `Set-Cookie`. Both are httpOnly, Secure, `SameSite=Lax`, and host-only to `admin.openfolio.site`. The access cookie `of_at` holds the access JWT, is scoped to `Path=/api`, and has `Max-Age=900`. The refresh cookie `of_rt` holds the opaque refresh token, is scoped to `Path=/api/auth`, and has a `Max-Age` equal to the seconds remaining until the earlier of the session's `idleExpiresAt` and `absoluteExpiresAt`, re-set at each rotation. Both are persistent cookies. Clearing a cookie sets it with the same name, `Path`, and attributes and `Max-Age=0`. The admin app never reads or writes either cookie. An access JWT expires 15 minutes after issue. A session — a refresh token and its rotations — expires after 30 days idle or 90 days absolute, whichever falls first, and the idle window is reset at each refresh. |
| FR-AUTH-4 | Must | **Deferred.** Applies when GitHub sign-in returns: a GitHub sign-in's OAuth token is reused for the GitHub integration rather than requiring a second authorisation. Until then, the integration's credentials are not yet specified. |
| FR-AUTH-5 | Should | The portfolio-creation screen, reached when an authenticated tenant has no portfolio, collects display name, desired slug, and preset in a single step and submits them to `POST /admin/portfolio`. Slug availability is checked live, through the session-authenticated availability endpoint (§7.2). |
| FR-AUTH-6 | Should | A tenant can delete their account. Deletion removes the portfolio, releases the slug after a 30-day hold, and purges media within 7 days. |
| FR-AUTH-7 | Must | Once authenticated — at sign-in, or on a later visit with a valid session — `admin` branches on whether the tenant has a portfolio, as reported by `GET /admin/me`: to the dashboard if one exists, to the creation screen if not. A portfolio is created only by `POST /admin/portfolio`, which requires a session, and at most once per tenant: `portfolios.userId` carries a unique index (§5.2), so a second creation, concurrent or not, is refused (§7.2). |
| FR-AUTH-8 | Must | The OAuth start and callback endpoints are `/auth/google/start` and `/auth/google/callback` in `api`'s auth module, reached through `gateway` at `/api/auth/*` on the admin host (§7.4). Per attempt, the auth module generates `state`, a PKCE verifier (S256), and a `nonce`, and stores them in a cookie scoped `Path=/api/auth`, `SameSite=Lax`, `Max-Age=600`. `state` is verified before the code is exchanged, and the cookie is cleared on completion or failure. |
| FR-AUTH-9 | Must | `api`'s auth module is the sole holder of the OAuth client secret, the PKCE verifier, and the redirect URI, and performs the code exchange itself. No inter-service call takes part in the exchange. It is refused for a suspended user. |
| FR-AUTH-10 | Must | The refresh token is 256 bits of cryptographic randomness, and only its SHA-256 hash is stored (§5.8). The raw refresh token never leaves `api`'s auth module except in the refresh cookie sent to the browser, and is never forwarded to the admin surface. The access JWT is never stored server-side. |
| FR-AUTH-11 | Must | Session resolution happens in `api`'s auth module, at `GET /auth/resolve`, invoked by `gateway` on every admin request before the admin surface is reached. A request without a valid API key is answered `401` before the access JWT is examined. Resolution then verifies the access JWT from the access cookie and nothing else: the header must name HS256 and a `kid` the verifier accepts, the signature must verify, and `exp` must not have passed. The token carries `sub` (the user id), `iat`, and `exp`. Success is a `204` with `X-User-Id` set to `sub`; any failure is a `401`, and the admin surface is never called. Resolution performs zero database reads and no writes — it reads neither `sessions` nor `users` and refreshes nothing — so revocation and suspension take effect at the next refresh, not here (§2.6). |
| FR-AUTH-12 | Must | `gateway` conveys the resolved identity to the admin surface as an `X-User-Id` request header, set from the identity subrequest's response and overwriting any inbound value, on a request that also carries the API key. The admin surface rejects a request that lacks a valid API key or whose `X-User-Id` is absent or malformed, and accepts no other caller-identifying input from any origin. No signed token or key pair takes part in that hop: the access JWT of FR-AUTH-11 is verified inside the auth module and goes no further, and the admin surface sees only `X-User-Id` and the API key. This requirement holds wherever `api` is hosted, publicly reachable or not. A per-request signed assertion in place of the bare key is not yet decided. |
| FR-AUTH-13 | Must | `users` and `sessions` are owned by `api`'s auth module. The admin and public surfaces read and write neither, and reach account data only through the interface of FR-AUTH-17. Session invalidation on account deletion and on operator suspension is an in-process call into the auth module. |
| FR-AUTH-14 | Must | `POST /auth/logout` revokes the session whose `tokenHash` matches the refresh cookie's token by setting `revokedAt`, clears both cookies, and answers `204` whether or not a session was found. It revokes that session only. `POST /auth/logout-all` verifies the access JWT as FR-AUTH-11 does and answers `401` if it is absent or invalid; the admin app then refreshes and retries under FR-AUTH-20. On success it revokes every session for the user named by `sub`, clears both cookies, and answers `204`. It is offered in admin as "sign out everywhere". Revocation by user id goes through FR-AUTH-17. An access JWT already issued stays valid until its `exp` (§2.6). |
| FR-AUTH-15 | Must | The post-callback redirect target is chosen from a fixed allowlist of paths within the admin origin. A `returnTo` value, if carried, is stored in the `state` cookie rather than the query string, and is rejected unless it is a relative path with no scheme, no authority, and no leading `//`. No user-supplied absolute URL is ever redirected to. |
| FR-AUTH-16 | Must | `/api/auth/*` is rate-limited at `gateway`, per IP, independently of FR-API-2, with a stricter limit on start and callback than on the rest. Exceeding it answers `429` without reaching `api`. |
| FR-AUTH-17 | Must | The auth module exports a declared in-process interface, the only route by which any other module reaches `users` or `sessions`. In v1 it provides the tenant's display fields for `GET /admin/me` and session revocation for a given user id. The provider-token accessor for the GitHub integration is added with FR-AUTH-4. No module outside auth registers a Mongoose model for `users` or `sessions`, and the ESLint zone of §2.1 enforces this. |
| FR-AUTH-18 | Must | `POST /auth/refresh`, reached as `/api/auth/refresh` (§7.4), validates the refresh cookie: the token's hash must match a session's `tokenHash`, the session must not be revoked, and it must be inside both its idle and absolute windows. On success it rotates the token — a new 256-bit token whose hash replaces `tokenHash`, the old hash moved to `previousTokenHash`, `idleExpiresAt` reset, `absoluteExpiresAt` carried unchanged — issues a new access JWT, and sets both cookies. A token whose hash matches a session's `previousTokenHash` is reuse, and revokes that session. Any failure, reuse included, is a `401` that clears both cookies. Only the immediately previous token is recognised as reuse; an older one matches no row and fails as unknown. Concurrent refreshes trip reuse detection. |
| FR-AUTH-19 | Must | The access JWT is signed with HS256 by `api`'s auth module, which alone holds the signing key and alone verifies tokens; no other module or service verifies it, and no asymmetric key or published key set exists. Keys are supplied to `api` by environment at run time and held outside the database and the deployment image: `AUTH_JWT_KEYS`, a JSON object mapping `kid` to a base64url key, with each key at least 256 bits decoded as RFC 7518 §3.2 requires and at most two entries, and `AUTH_JWT_CURRENT_KID`. The entry other than the current one, if present, is the previous key. Tokens are signed with the current key and carry its `kid` in the header; the verifier accepts the current and previous `kid` and rejects any other. Rotation is manual, on suspected compromise or operator decision, with no schedule. A previous key is removed no sooner than 15 minutes after its successor began signing. `api` refuses to start if the keys violate any of these rules. |
| FR-AUTH-20 | Must | On a `401` from any `/api/admin/*` request or from `POST /api/auth/logout-all`, the admin app calls `POST /api/auth/refresh` once and, if it succeeds, retries the original request once. Within one page, concurrent `401`s share a single in-flight refresh, and each original request is retried once after it completes. If the refresh answers `401`, the admin app sends the tenant to sign-in. A retried request that fails again is not refreshed a second time. Coordination across tabs is not specified. The admin app never reads or writes either cookie; the browser attaches them. |
| FR-AUTH-21 | Must | The ID token returned by the code exchange is validated before any write. Its signature must verify against Google's published keys. `iss` must be `https://accounts.google.com` or `accounts.google.com`, `aud` must equal the client id, `exp` must not have passed, `nonce` must match the `state` cookie, and `email_verified` must be `true`. Any failure redirects with `auth_failed` (§2.5). The user is upserted by `(provider: 'google', providerId: sub)`; `email`, `displayName`, `avatarUrl`, and `lastLoginAt` are refreshed at each sign-in. A new `sub` whose email is already held by another user fails with `auth_failed` and is logged. |
| FR-AUTH-22 | Must | The Google access token, refresh token, and ID token are discarded once sign-in completes, and none is stored. Sign-in requests no scope beyond `openid email profile`. |

### 6.2 Tenancy and addressing — `FR-TEN`

| ID | Priority | Requirement |
|---|---|---|
| FR-TEN-1 | Must | A published portfolio is served at `{slug}.openfolio.site` over a wildcard DNS record and wildcard TLS certificate. |
| FR-TEN-2 | Must | Tenant identity for public requests derives solely from the `Host` header. |
| FR-TEN-3 | Must | An unknown, unpublished, or suspended slug returns a branded 404 with `noindex`. It must not disclose whether the slug is registered. |
| FR-TEN-4 | Must | Every admin data access is scoped by the portfolio id resolved from the user id in the `X-User-Id` header set by `gateway`. A portfolio id supplied in a request body or path is ignored, never trusted. |
| FR-TEN-5 | Must | The public surface returns only `published` content. Sections with `enabled: false` are removed when the published tree is built — at publish, by the registry's builder — not at request time, so the stored tree never holds one and the public surface has nothing to strip before serialisation. A disabled section appears in neither `config.sections` nor `data`. |
| FR-TEN-6 | Could | Custom domain support — deferred. |

### 6.3 Portfolio and section configuration — `FR-CFG`

| ID | Priority | Requirement |
|---|---|---|
| FR-CFG-1 | Must | Every section can be enabled or disabled independently. *(18.2)* |
| FR-CFG-2 | Must | A section that is enabled but whose content satisfies its `emptyCondition` is omitted from the rendered page entirely. No headings, no empty state. The condition is evaluated when the published tree is built — at publish and at each fold of synced data (§2.3) — against the section's content after unpublished items are removed and synced values merged, and never at request time. An empty section is absent from both `config.sections` and `data`, so the renderer never meets one. *(18.1)* |
| FR-CFG-3 | Must | Sections are reorderable by drag or explicit ordinal; the order persists and drives render order. |
| FR-CFG-4 | Must | Publishing requires at least one enabled non-empty section. The `hero` section is enabled by default but remains toggleable — the source document's "Must" is read as *the system must support it*, not *the tenant must use it*. |
| FR-CFG-5 | Should | Admin displays a live preview of the draft, rendered by the same components as the public page and fed the same `{ config, data }` shape (§7.1). The shape is assembled in the `admin` app itself, by the registry package's builder, from the draft tree being edited and the cached integration payloads the admin surface returns with each connection's status. The preview therefore updates as the tenant types, with no round trip to `api`, and shows what a publish would produce. This keeps §2.1's rule: the builder is a pure function, not a DTO, and neither surface serialises the other's response — admin receives the draft through its own DTO and builds locally, and the public surface serialises the stored tree through its own. The preview never injects the analytics script, so a tenant's own editing does not register as visits. |
| FR-CFG-6 | Should | Admin surfaces the source document's guidance inline — e.g. enable Blog only with five or more posts *(7.3)*, enable Speaking only with active community involvement *(10.2)* — as advisory hints, not hard blocks. |
| FR-CFG-7 | Must | Adding or editing a project takes under 10 minutes through the admin forms and requires no layout decisions by the tenant. *(18.6)* |

### 6.4 Section content requirements — `FR-SEC`

#### 6.4.1 Hero — `hero`

| ID | Priority | Requirement |
|---|---|---|
| FR-SEC-HERO-1 | Must | Fields: name (required), professional title (required), tagline (1–2 lines), bio (2–3 sentences, soft character guidance shown), primary CTA, avatar. *(1.1–1.4)* |
| FR-SEC-HERO-2 | Must | The CTA is a typed choice — résumé download, scheduling link, or external URL — with a label and target. *(1.4)* |
| FR-SEC-HERO-3 | Must | Omitting the avatar produces a layout that reflows rather than leaving a gap or placeholder. *(1.5)* |

#### 6.4.2 Projects — `projects`

| ID | Priority | Requirement |
|---|---|---|
| FR-SEC-PROJ-1 | Must | A project carries two tiers of field, authored and stored separately rather than one derived from the other. **Card-level:** title, problem, solution, tech stack (tag list), impact, role, links, screenshot. **Modal-level:** `bodies.business`, `bodies.solution`, `bodies.role` (rich text, sanitised per FR-SEC-PROJ-12), `designation` (short text), `stackWorkedOn`, `tools`, `fullStack` (tag lists). The card fields are not truncations of the modal fields, and the modal is never rendered by cutting a card field short. `stackWorkedOn` is a subset of `fullStack`, and `tools` is orthogonal to both — that relationship is stated in admin help text and is the tenant's judgement, not a validated constraint. *(2.1–2.8, 2.17–2.23, 2.25)* |
| FR-SEC-PROJ-2 | Must | The 3–5 cap is enforced by the API, not merely advised in the UI. The maximum is enforced at save: a sixth project is rejected outright. The minimum of three is checked at publish, not at save, since a tenant cannot hold three projects while writing their first. The cap applies to the project collection regardless of how deeply any one project is rendered. *(2.9)* |
| FR-SEC-PROJ-3 | Must | At least one link to a demo or repository is required per project, unless the project is flagged confidential. *(2.7, 2.15)* |
| FR-SEC-PROJ-4 | Must | A confidential flag suppresses the repository link requirement and displays a "confidential engagement" note in place of employer identification. This holds wherever the project's links are rendered: on the card and in the modal footer, where the note — "Client work — source not public" — stands in the suppressed link's place rather than leaving a gap. *(2.15)* |
| FR-SEC-PROJ-5 | Must | Impact is a required field. Where no metric exists the tenant states what changed; the field cannot be saved empty. It appears on the card and again in the modal, where it is set as the pull-quote above the labelled sub-sections. *(2.5, 2.13)* |
| FR-SEC-PROJ-6 | Must | Projects render at two depths: a card scannable in roughly 15 seconds, and the full detail in an in-page modal dialog opened by clicking that card. There is no dedicated project route, no URL change, and no deep link to a single project. Project detail is neither deep-linkable nor separately crawlable. *(2.12)* |
| FR-SEC-PROJ-7 | Should | Category filtering across projects, with categories drawn from a tenant-editable list. Filtering is client-side over already-rendered data. *(2.10)* |
| FR-SEC-PROJ-8 | Should | Admin shows writing guidance for role and impact fields — first person, named components, no "worked on". This is guidance only; the system does not assess prose quality. The role guidance attaches to the modal-level "My role (full)" field (`bodies.role`), where the account is given at length, not to the card's one-line role. *(2.14, 2.20)* |
| FR-SEC-PROJ-9 | Should | The sync worker checks every project link weekly and records results in `linkHealth`. Two consecutive failures notify the tenant by email. Broken links are never auto-removed. A project's demo and repository links are stored once and checked once, wherever they are rendered — on the card and in the modal footer. *(2.16)* |
| FR-SEC-PROJ-10 | Must | The modal opens on a click of the project card, which is recorded as the focus-return target for FR-SEC-PROJ-13. It closes on the Escape key, on a click of the backdrop outside the dialog, or on a click of the close button. Scrolling of the page behind the modal is locked while it is open and restored on close, leaving the visitor where they were in the project grid. *(2.26, 2.29)* |
| FR-SEC-PROJ-11 | Must | The seven modal-level fields of FR-SEC-PROJ-1 are required for publish. Publish validation rejects a project with any of `bodies.business`, `bodies.solution`, `bodies.role`, `designation`, `stackWorkedOn`, `tools`, or `fullStack` empty, and reports every such failure at once rather than stopping at the first, per FR-PUB-6. *(2.17–2.23)* |
| FR-SEC-PROJ-12 | Must | The three `bodies.*` fields are stored as sanitised HTML, admitted by allowlist: paragraph, unordered list, ordered list, list item, strong, emphasis, underline, and line break. No anchors, no images, no scripts, no styles, and no attributes on any admitted tag. Sanitisation runs at write time, so what is stored is already safe; the render path injects the stored markup as HTML and is safe only for that reason. The allowlist exists once, as a single constant exported by the registry package and applied by `api` at write time; a rich-text field added in any section type imports that constant rather than declaring its own. These are the first rich-text fields in the system and therefore the first concrete instance of NFR-SEC-2. *(2.24)* |
| FR-SEC-PROJ-13 | Must | While the modal is open, Tab and Shift+Tab cycle only among the focusable elements inside the dialog. On open, focus moves to the close button; on close, it returns to the card that opened the modal. The dialog carries `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing at the heading that holds the project title. The close button carries `aria-label="Close case study"` and a hit area of at least 44×44 px. This concretises NFR-A11Y-1 and NFR-A11Y-2 for the modal pattern. *(2.27, 2.28, 2.30, 2.31)* |

#### 6.4.3 Skills — `skills`

| ID | Priority | Requirement |
|---|---|---|
| FR-SEC-SKILL-1 | Must | A skill is stored once: `{ id, name, category, rating (1–10), prominent (bool), order }`. Both display tiers derive from this single array. *(3.11)* |
| FR-SEC-SKILL-2 | Must | The prominent tier renders 5–8 skills in a card grid — 2–3 columns desktop, 1 column mobile — each with name, efficiency bar, and numeric rating. *(3.1–3.3)* |
| FR-SEC-SKILL-3 | Must | The prominent count is enforced: fewer than 5 or more than 8 flagged skills blocks publish with a clear message. Both bounds are checked at publish, not at save, per FR-REG-8. *(3.1)* |
| FR-SEC-SKILL-4 | Must | All prominent cards use one accent colour. Per-skill colour is not configurable, so the set reads as "featured" rather than internally ranked. *(3.4)* |
| FR-SEC-SKILL-5 | Must | The detailed tier groups every skill by category, in a multi-column auto-fit layout that reflows to viewport width. *(3.6, 3.7)* |
| FR-SEC-SKILL-6 | Must | Detailed-tier bars are rendered at a smaller size than prominent-tier bars, as a theme constant rather than a per-tenant setting. *(3.10)* |
| FR-SEC-SKILL-7 | Must | The numeric rating is always present as text, adjacent to the bar. Bar length and colour are never the sole carrier of the value. *(3.15)* |
| FR-SEC-SKILL-8 | Must | Categories are tenant-editable. A category with no skills is not rendered. *(3.6, 3.16)* |
| FR-SEC-SKILL-9 | Should | Skills are reorderable within a category. *(3.14)* |
| FR-SEC-SKILL-10 | Should | The rating scale definition is shown in admin at the point of data entry, and the tenant may optionally publish it as a legend on the page. *(3.12)* |

Business requirements 3.5, 3.9, and 3.13 are editorial judgements about *which* skills to include and how honestly to rate them. They cannot be enforced by software. They are surfaced as admin help text and are explicitly out of scope for validation.

#### 6.4.4 Contact — `contact`

| ID | Priority | Requirement |
|---|---|---|
| FR-SEC-CON-1 | Must | Fields: email, GitHub, LinkedIn, X, personal site. *(4.1, 4.2)* |
| FR-SEC-CON-2 | Must | Each link has an independent visibility toggle. *(4.3)* |
| FR-SEC-CON-3 | Must | A published email address is obfuscated against naive scrapers — rendered via a `mailto:` assembled client-side. |

#### 6.4.5 Remaining types

| ID | Priority | Requirement |
|---|---|---|
| FR-SEC-EXP-1 | Should | Experience: company, title, start/end dates, description, accomplishment list. Individually collapsible on the public page, ordered by the tenant. *(5.1, 5.3, 5.4)* |
| FR-SEC-EXP-2 | Should | Admin shows writing guidance on the accomplishment list — impact rather than duties. Guidance only; as with FR-SEC-PROJ-8 the system does not assess prose quality. *(5.2)* |
| FR-SEC-EDU-1 | Should | Education: degree, institution, graduation date, plus individually hideable GPA, coursework, scholarships, honours. Default position below experience and projects. *(6.1–6.3)* |
| FR-SEC-BLOG-1 | Should | Blog: per post title, date, summary, link — entered manually or populated by RSS sync. *(7.1, 7.2)* |
| FR-SEC-TEST-1 | Should | Testimonials: name, company, role, quote, optional photo. 2–4 entries enforced. *(8.1–8.3)* |
| FR-SEC-OSS-1 | Should | Open source: GitHub profile link, stats block (repositories, commits over the last twelve months, pull requests, contributions), and 2–3 named contributions each with an optional impact figure. The tenant's own star total is not one of the stats; a named contribution may carry a star count as adoption evidence. *(9.1–9.4)* |
| FR-SEC-SPK-1 | Could | Speaking: conference, date, title, link to video or slides. *(10.1)* |
| FR-SEC-ACH-1 | Should | Achievements: title, issuer, date, optional link, type (certification / award / ranking / hackathon). *(11.1–11.3)* |
| FR-SEC-TRN-1 | Could | Trainings: title, issuer, date, optional link, type (certification / award / ranking / hackathon) — field for field identical to Achievements, differing only in label, help text, and default order. *(11a.1–11a.5)* |
| FR-SEC-GAL-1 | Could | Gallery: images with captions and alt text, plus embedded video by URL from an allowlist of providers. *(12.1, 12.2)* |

#### 6.4.6 Embedded third-party content — GitHub cards and Credly badges

GitHub stat cards *(9.6, 9.7)* and Credly badges *(11.4–11.9)* are one mechanism wearing two labels: a URL the platform stores and the visitor's browser resolves. Neither creates an account connection, stores a credential, nor runs a refresh job *(13.6, 13.9)*. The platform therefore always shows a current picture with nothing to keep in sync, in exchange for a dependency it does not control.

Both are also **opaque** to the platform: it cannot read what a card or badge draws. No figure that matters may live only inside one.

The requirements below are Should, following business §9 and §11. The rules governing *how* they connect — FR-INT-11 … 14 and NFR-SEC-4 — are Must, because they constrain what the platform stores and what it lets into a page. §1.4 explains the split.

| ID | Priority | Requirement |
|---|---|---|
| FR-SEC-OSS-2 | Should | Three GitHub card types are offered — overall statistics, most-used languages, and contribution streak. The tenant chooses which appear; statistics and languages are enabled by default. *(9.6, 9.7)* |
| FR-SEC-OSS-3 | Should | The statistics card is requested with its star count suppressed, and the tenant's own total star count is never rendered as a headline figure — it measures attention received, not work done. A named project's stars may still appear as adoption evidence under FR-SEC-OSS-1. *(9.5, 9.7)* |
| FR-SEC-OSS-4 | Should | Every figure that matters is also typed by the tenant and rendered as text. A card is never the sole carrier of a number. *(9.8)* |
| FR-SEC-ACH-2 | Should | Credly badges occupy the same ordered list as hand-entered achievements and are edited, reordered, and deleted identically. There is no separate badges list. *(11.4)* |
| FR-SEC-ACH-3 | Should | Two ways to add a badge: bulk import from a public Credly profile, or paste a single badge's embed code. *(11.5, 13.8)* |
| FR-SEC-ACH-4 | Should | Import is a one-time populate, not a live connection. Re-running it adds only badges not already present, and never overwrites an existing item — including one the tenant has edited. *(11.6)* |
| FR-SEC-ACH-5 | Should | Imported badges arrive unpublished. Deciding which are high-signal is a judgement the import cannot make, so the tenant promotes them individually before they reach the published tree. *(11.7, 11.3)* |
| FR-SEC-ACH-6 | Should | A badge renders as Credly's own embedded frame, showing the badge alone. Its name and issuer are stored alongside and rendered as text, because the frame's contents cannot be read aloud. *(11.8)* |
| FR-SEC-ACH-7 | Should | A badge's state is drawn by Credly, not by the platform. An expired badge displays as expired; the tenant may delete it but cannot restyle or suppress that state. *(11.9)* |

**Known limitation.** Credly answers an unknown, revoked, or mistyped badge identifier as though it were valid, so a blank badge cannot be detected automatically; the tenant notices it and deletes it under FR-SEC-ACH-2.

### 6.5 Media — `FR-MED`

| ID | Priority | Requirement |
|---|---|---|
| FR-MED-1 | Must | Uploads go directly to object storage via a short-lived signed URL issued by the API. The API never proxies file bytes. |
| FR-MED-2 | Must | Accepted types: JPEG, PNG, WebP, SVG, PDF (résumé only). Maximum 10 MB per file. Content type is verified from magic bytes, not the declared header. |
| FR-MED-3 | Must | SVG uploads are sanitised to strip scripts and external references before storage. |
| FR-MED-4 | Must | Each upload generates WebP derivatives at defined widths; the public page serves a responsive `srcset`. *(18.5)* |
| FR-MED-5 | Must | Alt text is a required field at upload time. An image cannot be attached to content without it. *(18.4)* |
| FR-MED-6 | Must | Media below the fold is lazy-loaded; images carry explicit dimensions to prevent layout shift. *(18.5)* |
| FR-MED-7 | Must | Per-tenant storage is capped at 200 MB. |

### 6.6 Integrations — `FR-INT`

Business requirement 13.5 is the strongest constraint in the source document and drives the whole design of this group.

| ID | Priority | Requirement |
|---|---|---|
| FR-INT-1 | Must | The server calls no third-party API during a public page render; all external data it renders is read from the published tree. Embedded cards and badges are fetched by the visitor's browser after the response is sent, and are not part of the render. *(13.5)* |
| FR-INT-2 | Must | A scheduled worker refreshes each connection on its own interval — GitHub every 6 hours, RSS every 3 hours — with exponential backoff on failure. The schedule is held in data, not in the process: each connection's `nextSyncAt` (§5.4) advances by its interval after a successful sync and by its backoff after a failed one, and a connection is due when its `nextSyncAt` has passed. Runs are started by the trigger of FR-INT-16. |
| FR-INT-3 | Must | On sync failure nothing is written to `portfolios`. The copy of the payload folded into the published tree at the last successful sync or publish continues to serve unchanged, and the `integrationCache` entry is marked `stale`. The public page renders identically, since the published tree carries no staleness; staleness is visible only in admin, which reads it from `integrationCache`. *(13.5)* |
| FR-INT-4 | Must | Every integration-backed field is also manually editable. Manual values take precedence over synced values when both exist. *(13.5)* |
| FR-INT-5 | Must | Where neither synced nor manual data exists, the affected section is hidden by the standard empty rule rather than rendered broken. *(13.5, 18.1)* |
| FR-INT-6 | Must | Integration credentials are encrypted at rest and are never included in any public API response. |
| FR-INT-7 | Should | GitHub: repository links and profile statistics. *(13.1)* |
| FR-INT-8 | Should | RSS: posts from Medium, Dev.to, Substack, or a self-hosted feed, capped at 10 most recent. Feed URLs are validated against SSRF — no private address ranges, no redirects to them. *(13.2)* |
| FR-INT-9 | Could | X/Twitter latest posts. *(13.3)* |
| FR-INT-10 | Could | LinkedIn import for experience and education, as a one-time populate rather than a live sync. *(13.4)* |
| FR-INT-11 | Must | GitHub stat cards are stored as URLs and requested by the visitor's browser from GitHub's card service. The platform holds no account connection, no token, and no refresh job for them, and stores no card content. *(13.6)* |
| FR-INT-12 | Must | A card that fails to load is removed from the layout rather than left as a broken image. With every card absent, the section still renders from the tenant's typed figures and profile link. *(13.7)* |
| FR-INT-13 | Must | Credly badges are stored as identifiers and requested by the visitor's browser from Credly. The platform holds no account connection and no stored credential, and runs no refresh job. *(13.9)* |
| FR-INT-14 | Must | Only the badge identifier is extracted from a pasted Credly embed code. The pasted markup itself is never stored and never re-injected into a page. *(13.10)* |
| FR-INT-15 | Must | A successful sync whose payload differs from the cached one writes it to `integrationCache` and then folds it into the published tree: `published.config` and `published.data` are rebuilt by the registry's builder from `published.source` and every provider's current cached payload, and the slug is revalidated as on publish (§2.3). The fold never reads `draft`, so it cannot publish an edit the tenant has not. It is a single update conditional on the `version` it read, retried on a mismatch, so it cannot overwrite a publish or another fold that landed while it ran. A portfolio with no published tree is not written; its next publish folds the payload in. An unchanged payload writes nothing to `portfolios` and revalidates nothing. |
| FR-INT-16 | Must | Sync runs, and the weekly link checks of FR-SEC-PROJ-9, are started by an external scheduler calling `POST /internal/sync` on `api` at a fixed cadence of at most 15 minutes. The call requires `Authorization: Bearer <sync trigger secret>`, compared in constant time, and is answered `401` otherwise; `gateway` does not route it. Each call claims due connections and links by a conditional update that sets `leaseUntil`, so overlapping calls never process the same item. It processes at most a configured batch within a configured time budget, releases any claim it has not finished, and answers `204`. No state between runs lives in process memory, so the module behaves identically in a long-running process and in a request-scoped one. |

FR-INT-11 and FR-INT-13 are not exceptions to FR-INT-1 so much as a different category. FR-INT-1 constrains what the *server* does while assembling a response; a card or badge URL is inert content within that response, resolved later by the browser. Nothing is fetched, so nothing is cached, so FR-INT-2 and FR-INT-3 have nothing to act on — which is why these two carry no staleness story at all. What they carry instead is a visitor-visible failure mode, handled by FR-INT-12 and FR-SEC-OSS-4.

### 6.7 Theme — `FR-THM`

| ID | Priority | Requirement |
|---|---|---|
| FR-THM-1 | Must | One layout for all tenants. Configurable: accent colour, light/dark/system default, font pairing from a curated list. *(14.1, 14.2)* |
| FR-THM-2 | Must | Theme values render as CSS custom properties on the document root. No per-tenant stylesheet is generated or stored. |
| FR-THM-3 | Must | The accent colour picker rejects values failing WCAG AA contrast against both light and dark backgrounds, offering the nearest compliant shade. *(18.4)* |
| FR-THM-4 | Could | Logo or avatar reused across the site and in social previews. *(14.3)* |
| FR-THM-5 | Could | Layout density — compact or spacious — as a spacing-scale multiplier. *(14.4)* |
| FR-THM-6 | Must | Tenants cannot supply raw CSS, HTML, or JavaScript. A pasted Credly embed code is not an exception: only the badge identifier is extracted from it and the markup is discarded. |

### 6.8 SEO and publishing — `FR-PUB`

| ID | Priority | Requirement |
|---|---|---|
| FR-PUB-1 | Must | Per-portfolio page title, meta description, and keywords, each with a sensible default derived from hero content. *(15.1–15.3)* |
| FR-PUB-2 | Must | Open Graph and Twitter Card tags on every public page. *(15.4, 17.2)* |
| FR-PUB-3 | Must | An OG image is either uploaded by the tenant or generated at publish time from name, title, and accent colour. *(15.4)* |
| FR-PUB-4 | Must | Server-side rendering delivers complete content in the initial HTML response, without requiring client-side JavaScript for crawlers. |
| FR-PUB-5 | Should | Per-tenant `sitemap.xml` and `robots.txt`. Unpublished and suspended portfolios are excluded and marked `noindex`. *(17.3)* |
| FR-PUB-6 | Must | Publishing validates the draft against the registry and reports every failure at once, per field, rather than stopping at the first. |
| FR-PUB-7 | Must | Publish triggers on-demand revalidation for the tenant's paths; the live page reflects changes within 60 seconds. |
| FR-PUB-8 | Should | A tenant can unpublish, returning the subdomain to the 404 state without deleting content. |

### 6.9 Analytics — `FR-ANL`

| ID | Priority | Requirement |
|---|---|---|
| FR-ANL-1 | Should | A tenant supplies their own Plausible domain or Google Analytics measurement id. It is stored in the content tree (§5.2) and published as `config.analytics`, the only analytics configuration the public surface returns; `portfolio` injects the script only when that key is present. The id is public-safe under §2.1 — the injected script carries it in the page source of every view. *(16.1)* |
| FR-ANL-2 | Should | Goal events fire on résumé download, contact link click, and GitHub link click. *(16.2)* |
| FR-ANL-3 | Must | No analytics script loads when the tenant has not configured one: an unconfigured tenant's published `config` carries no `analytics` key, and `portfolio` injects nothing in its absence. The platform does not inject its own tracking into tenant pages. |

### 6.10 Gateway routing and identity — `FR-EDGE`

| ID | Priority | Requirement |
|---|---|---|
| FR-EDGE-1 | Must | `gateway` matches the request's `Host`, case-insensitively and with any port stripped, before anything else. Two hostnames are matched exactly, both supplied by environment: `GATEWAY_ADMIN_HOST`, which carries the admin route, and the public-read host, `api.openfolio.site`. A `Host` matching neither is answered by closing the connection without a response. `admin.openfolio.site`, the apex, and the tenant wildcard do not resolve to `gateway`. |
| FR-EDGE-2 | Must | **Admin route (`GATEWAY_ADMIN_HOST`):** `/api/auth/resolve` answers `404`. Other `/api/auth/*` paths route to `api`'s `/auth/*` without an identity subrequest. `/api/admin/*` routes to `api`'s `/admin/*` with the subrequest of FR-EDGE-3. Every other path answers `404`: `gateway` serves no SPA. **Public-read host (`api.openfolio.site`):** `GET` and `HEAD` on `/public/*` route to `api`'s `/public/*`; everything else answers `404`. `/public/*` is not routable from the admin route, and `/admin/*` and `/auth/*` are not routable from the public-read host. |
| FR-EDGE-3 | Must | Before proxying any `/api/admin/*` request, `gateway` sends an HTTP `GET` to `api`'s `/auth/resolve` at the upstream address supplied by environment. The request carries the inbound `Cookie` and `X-Request-Id` headers and the API key, and no body, with a 2-second timeout. A `204` carrying a well-formed `X-User-Id` permits the request to proceed. A `401` or `403` is propagated to the client with no body, and the admin surface is not called. Any other outcome, including a timeout or a `2xx` without `X-User-Id`, is a `502`. |
| FR-EDGE-4 | Must | `gateway` sets `X-User-Id` on every request it proxies to `api` — from the subrequest's response header on authenticated locations, and to the empty value everywhere else. It sets `X-Api-Key` to its current key on every request it sends to `api`, the identity subrequest included. Both are set unconditionally, overwriting any inbound value, so neither a client-supplied `X-User-Id` nor a client-supplied `X-Api-Key` can reach `api` through `gateway` on any route. |
| FR-EDGE-5 | Must | `api` may be publicly reachable, and this specification places no requirement on its network placement. Every request to `/auth/*` or `/admin/*`, `/auth/resolve` included, must carry an `X-Api-Key` header equal to a key `api` accepts, compared in constant time. A request without one is answered `401` with no body, before any guard, controller, or database access. `X-User-Id` is ignored on a request without a valid key. `/public/*` requires no key, and is reachable at `api`'s own address as well as through `gateway`. `/internal/sync` is guarded by a secret of its own. This is the precondition FR-AUTH-12 depends on. |
| FR-EDGE-6 | Must | `gateway`'s routing rules are source code in `apps/gateway`, versioned in the monorepo and identical in every environment. Hostnames, upstream addresses, TLS material, limits, and the API key are supplied by environment variables. The development environment runs the same service with the same rules, because the routing rules are part of the security boundary, and a rule that exists only in production is a rule that is never tested. The admin host's proxy rules are likewise source code versioned in the monorepo and identical in every environment; in development the admin host is the admin dev server, which applies the same rules. |
| FR-EDGE-7 | Must | `gateway` holds one secret, the API key, and no signing key. It does not parse, verify, or log cookie values or tokens, and it redacts `Cookie`, `Set-Cookie`, `Authorization`, and `X-Api-Key` from its logs. Identity decisions are made only by `api`'s auth module; the key authenticates `gateway` as a caller and decides nothing about a tenant. |
| FR-EDGE-8 | Must | The API key is 256 bits of cryptographic randomness, encoded as base64url, and is used for nothing else: it is distinct from the keys of `AUTH_JWT_KEYS`, from the revalidation secret, and from the sync trigger secret. `gateway` is supplied one key, `GATEWAY_API_KEY`. `api` is supplied `GATEWAY_API_KEYS`, a JSON array of one or two keys, and accepts either. Rotation is manual, on suspected compromise or operator decision, with no schedule, and takes three steps: the new key is added to `api`'s list; `gateway` is redeployed with it; the old key is removed from `api`'s list once no `gateway` instance sends it. Both services refuse to start if a key is shorter than 256 bits decoded, and `api` also if its list is empty or longer than two. Custody follows NFR-SEC-3. |
| FR-EDGE-9 | Must | The admin host serves the admin SPA build for every path outside `/api/*`, with `index.html` for a path matching no file. It forwards every `/api/*` request to `https://<GATEWAY_ADMIN_HOST>` with the same method, path, query, and body; forwards the inbound `Cookie` header unchanged; sets `X-Forwarded-For`, `X-Forwarded-Host` (`admin.openfolio.site`), and `X-Forwarded-Proto`; and returns the response with its status, `Set-Cookie`, and `Location` unchanged. It does not follow redirects, does not cache `/api/*` responses, and does not add, remove, or rewrite cookies or their attributes. It holds no secret and no session. It sets no `X-User-Id` and no `X-Api-Key`; `gateway` overwrites both regardless. |
| FR-EDGE-10 | Must | `gateway` determines the client address, for rate limiting and for logs, from `X-Forwarded-For` only when the immediate peer address is within `TRUSTED_PROXY_CIDRS`, taking the rightmost address that is not itself in that list; otherwise it uses the peer address. `TRUSTED_PROXY_CIDRS` is supplied by environment and may be empty. |

---

## 7. API surfaces

### 7.1 Public (`/public`, unauthenticated, read-only)

```
GET  /public/portfolios/:slug            → render payload for a published portfolio
GET  /public/portfolios/:slug/sitemap.xml
```

The render payload is two top-level objects and nothing else:

```
{
  config: {
    theme:     { ... },                  // FR-THM-1, FR-THM-5
    seo:       { ... },                  // FR-PUB-1, FR-PUB-3 — title, description, keywords, OG image
    analytics: { provider, id },         // FR-ANL-1 — absent when the tenant has configured none
    sections:  [ { type, order }, ... ]  // enabled, non-empty sections only, in ascending order
  },
  data: {
    hero:      { ... },                  // a single-cardinality type: one object
    projects:  { items: [ ... ], ... },  // a collection type: its items, in order, beside its section-level fields
    skills:    { items: [ ... ], ... },
    ...                                  // one key per entry in config.sections, and no other
  }
}
```

`config` is everything that decides whether and how content appears, and every value in it is public-safe in §2.1's sense: theme, SEO, and the analytics id all appear in the rendered page's source whether or not the API returns them. `data` is content only — no `enabled` flag, no section `order`, nothing the renderer consults to decide whether to draw a section, which `config.sections` has already decided. A disabled or empty section is absent from both halves. `data[type]` is the section's content object as the builder left it: a collection's items stay under `items`, with unpublished items removed, alongside the section-level fields the descriptor declares, which a bare array would have nowhere to carry. A key in `data` with no matching entry in `config.sections`, or the reverse, is a defect in the builder, not a state the renderer handles.

Keying `data` by type relies on a portfolio holding at most one section of each type, which the admin routes of §7.2 already assume by addressing a section as `:type`. A second instance of one type — two galleries, say — would need a key other than its type, and this shape would change with it.

Both halves are stored in this shape (§5.2), so the endpoint's work is one find on `portfolios` and a serialisation through the public DTO.

Project detail is delivered inside `data.projects`, modal-level fields included, and is not served by an endpoint of its own. The modal opens over content the page already holds, so a per-project route would add a surface that nothing requests.

**FR-API-1 (Must)** — Public responses are assembled from dedicated DTOs that admit the public-safe configuration of §2.1 — theme, SEO, the analytics measurement id or Plausible domain, and the section list — alongside published content, and omit every internal field: user id, account email, draft content, `published.source`, disabled sections, integration credentials, sync status, `lastError`. The DTO admits the two halves of §7.1 and nothing else; the content inside `data` is bounded by the fields the registry declares, since draft writes are validated against them and the builder adds none.

**FR-API-2 (Must)** — Public endpoints are rate-limited per IP and cached at the edge with a short TTL.

### 7.2 Admin (`/admin`, session-authenticated)

```
GET   /admin/me                              → the tenant; portfolio is null when none exists
GET   /admin/slug-availability?slug=         → available | taken | reserved | invalid
POST  /admin/portfolio                       → create, once per tenant
GET   /admin/portfolio                       → full draft; 404 when no portfolio exists
PATCH /admin/portfolio/theme
PATCH /admin/portfolio/seo
PATCH /admin/portfolio/slug                  → change only; always triggers FR-DAT-2
GET   /admin/portfolio/sections
PATCH /admin/portfolio/sections/:type        → toggle, reorder, replace content
POST  /admin/portfolio/sections/:type/items  → collection types
PATCH /admin/portfolio/sections/:type/items/:itemId
DELETE /admin/portfolio/sections/:type/items/:itemId
POST  /admin/media/upload-url
DELETE /admin/media/:id
GET   /admin/integrations
POST  /admin/integrations/:provider
POST  /admin/integrations/:provider/sync     → manual refresh
DELETE /admin/integrations/:provider
POST  /admin/integrations/credly/import      → one-time populate from a public profile
POST  /admin/integrations/credly/badge       → add one badge from a pasted embed code
POST  /admin/publish
POST  /admin/unpublish
GET   /admin/link-health
```

**Creation.** `POST /admin/portfolio` takes `{ name, slug, preset }` — the three fields of FR-AUTH-5, `preset` being a preset id. On success it creates the portfolio with `status: 'unpublished'`, `published: null`, and `draft` as returned by the registry's preset function, and responds `201` with the draft as `GET /admin/portfolio` returns it. On any failure nothing is written:

- `422` with field-level errors for a malformed body, an unknown preset, a slug that fails format validation, or a slug on the reserved list of FR-DAT-1 (`slug_reserved`).
- `409 portfolio_exists` when the tenant already has a portfolio. The unique index on `portfolios.userId` decides it, so two concurrent requests from one tenant create one portfolio. It takes precedence over every slug error.
- `409 slug_taken`, as a field-level error on `slug`, when the slug belongs to another portfolio, is held in another portfolio's `slugHistory`, or is in a deletion hold. The unique index on `slug` decides a race between two tenants, so a slug reported available a moment earlier can still collide at the write.

**Slug availability.** `GET /admin/slug-availability?slug=` requires a session and is open to any tenant, with or without a portfolio. It answers `{ slug, status }`, where `status` is `invalid`, `reserved`, `taken` — by the same rules as `409 slug_taken` — or `available`. The answer is advisory; only the write decides. No unauthenticated slug lookup exists: §7.1 offers none, and FR-TEN-3's 404 discloses nothing.

**A tenant with no portfolio.** `GET /admin/me` responds `200` with the tenant and `portfolio: null`; when a portfolio exists, `portfolio` is `{ slug, status }`. `admin` branches on this field. `GET /admin/portfolio` responds `404 portfolio_not_found`, and so does every other route above except `GET /admin/me`, `GET /admin/slug-availability`, and `POST /admin/portfolio`, since FR-TEN-4 has no portfolio id to scope them by.

**Slug change.** `PATCH /admin/portfolio/slug` changes the slug of an existing portfolio and does nothing else. It never creates a portfolio or sets a first slug — that is `POST /admin/portfolio` — and with no portfolio it responds `404` as above. Every successful call is a change and triggers FR-DAT-2: the old slug enters `slugHistory` and its subdomain answers with a 301. A request naming the current slug is rejected with `422 slug_unchanged` rather than accepted as a no-op, so no success skips FR-DAT-2. The new slug is validated, and collides, exactly as at creation.

**Draft concurrency.** `GET /admin/portfolio`, `GET /admin/portfolio/sections`, the `201` of `POST /admin/portfolio`, and every successful draft write answer with an `ETag` header holding the draft's `draftRevision` (§5.2) as a strong tag, e.g. `"7"`; the same value is in the body as `draftRevision`. A draft write is any route above that changes `draft`: the `PATCH` routes for theme, SEO, and a section, and the three item routes. Each must carry `If-Match` with the revision the caller last read, quoted as issued or bare. The write is one update conditional on that revision and increments it. On any refusal nothing is written:

- `409 stale_write` when `If-Match` is absent or is not the current revision. The body carries the current `draftRevision`, so the caller can re-read and decide; `api` never merges.
- `400 invalid_if_match` when the header is not a single revision. A weak tag, `*`, and a list are refused: `*` would match any revision, and a weak tag cannot be compared strongly.

`PATCH /admin/portfolio/slug`, `POST /admin/publish`, and `POST /admin/unpublish` do not change `draft`, take no `If-Match`, and leave `draftRevision` as it was. The publish response carries `version`, `publishedAt`, and `publishedDraftRevision`.

**FR-API-3 (Must)** — No admin endpoint accepts a portfolio id or user id as a parameter. Scope comes from the `X-User-Id` header set by `gateway`.

**FR-API-4 (Must)** — Write endpoints validate against the section registry and return field-level errors.

### 7.3 Internal

```
POST /internal/revalidate      → shared-secret auth, called by api → portfolio
GET  /auth/resolve             → subrequest target, called by gateway → api
POST /internal/sync            → sync trigger secret, called by scheduler → api (FR-INT-16)
```

`GET /auth/resolve` is called by `gateway` at `api`'s upstream address, and no `gateway` host routes to it. At `api`'s own address, which may be public, it answers `401` to a request without a valid API key. It verifies the access JWT's signature and `exp` only, performing no database read, and answers `204` with `X-User-Id` on success and `401` otherwise, with no body in either case. `/internal/revalidate` belongs to `portfolio`. `api` trusts no caller-identity header except on a request carrying a valid API key.

### 7.4 Auth (`/api/auth`, admin host)

```
GET  /api/auth/google/start      → begins sign-in (FR-AUTH-8)
GET  /api/auth/google/callback   → completes sign-in, sets the access and refresh cookies
POST /api/auth/refresh           → rotates the refresh token, issues a new access JWT (FR-AUTH-18)
POST /api/auth/logout            → revokes the presented session (FR-AUTH-14)
POST /api/auth/logout-all        → revokes every session for the user named by the access JWT
```

`POST /api/auth/refresh` falls under the rate limit of FR-AUTH-16 as one of "the rest" — the limit for endpoints other than start and callback.

**The proxy rule.** On `admin.openfolio.site`, `/api/*` is proxied by the admin host to `gateway`, and `gateway` proxies `/api/auth/*` and `/api/admin/*` to `api`. Everything else is the `admin` app, served by the admin host.

---

## 8. Non-functional requirements

### 8.1 Performance — `NFR-PERF`

| ID | Priority | Requirement |
|---|---|---|
| NFR-PERF-1 | Must | A cached public page responds in under 200 ms at the edge; an uncached render completes in under 800 ms at p95. |
| NFR-PERF-2 | Must | Largest Contentful Paint under 2.5 s on a 4G connection; Cumulative Layout Shift under 0.1. |
| NFR-PERF-3 | Must | A public page render performs at most one database read and zero server-side external HTTP calls: no read when the page is served from cache, and on an uncached render exactly one — a single find on `portfolios` keyed by slug. This holds by construction rather than by effort: the published tree is stored in the shape it is served in (§5.2), so there is nothing else to read and nothing to compute. Cards and badges are fetched by the visitor's browser, are excluded from render timing, and are lazy-loaded with reserved dimensions so they cannot spend NFR-PERF-2's layout-shift budget. |
| NFR-PERF-4 | Should | The system sustains 500 concurrent public page views without degradation. |
| NFR-PERF-5 | Should | An authenticated admin request completes in under 150 ms at p95, measured at `gateway` from request receipt to response completion and therefore excluding the visitor's own network latency. The admin host's hop lies outside this measurement; if its latency is material, it is recorded alongside. The identity subrequest — access JWT verification, with no database read, and response — accounts for under 15 ms at p95. Enforcing this requires request timings collected somewhere that computes percentiles; if that is not stood up before launch, this requirement is not met merely because nothing reports a violation. |

### 8.2 Security and isolation — `NFR-SEC`

| ID | Priority | Requirement |
|---|---|---|
| NFR-SEC-1 | Must | Cross-tenant read or write is impossible through any endpoint. This is verified by an automated test suite that attempts every admin endpoint with a second tenant's identifiers. The suite runs against the deployed topology, through the admin host and `gateway`, not against the `api` process directly, because `api` cannot know which hostname the browser used. It additionally asserts, from a real browser context at `admin.openfolio.site`, through the admin host: that `/admin/*` and `/auth/*` are unroutable from the public-read host, and that `/public/*` and `/auth/resolve` are not routed by `gateway` on its admin route; that neither a client-supplied `X-User-Id` nor a client-supplied `X-Api-Key` reaches `api` through `gateway` on any route, each being overwritten; that `Set-Cookie` arrives with neither cookie of FR-AUTH-3 carrying a `Domain` attribute, the access cookie carrying `Path=/api` and the refresh cookie `Path=/api/auth`; that `/api/*` responses are not cached by the admin host; that neither cookie is sent on a request to a tenant subdomain; and that a browser signed in at `admin.openfolio.site` sends neither cookie on a request to `gateway`'s own hostname. It also asserts, at `api`'s own address, that `/auth/*` and `/admin/*` answer `401` to a request without the API key. |
| NFR-SEC-2 | Must | All tenant-supplied text is escaped on render. Rich text, if permitted in any field, passes an allowlist sanitiser server-side before storage. |
| NFR-SEC-3 | Must | Integration credentials and OAuth tokens are encrypted at rest with a key held outside the database. The same custody rule governs every service-to-service secret: the shared secret guarding `POST /internal/revalidate` is held outside the database and outside the deployment image, and is supplied at run time. The API keys of FR-EDGE-8 and the sync trigger secret of FR-INT-16 are held under the same rule. |
| NFR-SEC-4 | Must | A strict Content Security Policy is served on public pages, permitting only the platform's own origins, the CDN, a configured analytics origin, GitHub's card service in `img-src`, and Credly's badge host in `frame-src`. No third-party origin is granted `script-src`. *(13.6, 13.9)* |
| NFR-SEC-5 | Must | Outbound requests from the sync worker are restricted against SSRF: no private ranges, no link-local addresses, redirect chains re-validated at each hop. |
| NFR-SEC-6 | Should | Content mutations are recorded in `auditLog`. |
| NFR-SEC-7 | Must | Refresh tokens are unguessable — 256 bits of cryptographic randomness — and are stored only as SHA-256 hashes, so a database read yields no usable session; access JWTs are not stored at all. The system's one signing key is the access JWT key of FR-AUTH-19, held and used by the auth module alone. No signing key takes part between `gateway` and the admin surface: the caller on that hop is authenticated by the API key. |
| NFR-SEC-8 | Must | `api` trusts no identity-bearing request header unless the request carries a valid API key. `gateway` sets `X-User-Id` and `X-Api-Key` unconditionally on every request it sends to `api`, and `api` rejects a request to `/auth/*` or `/admin/*` without a valid key and ignores `X-User-Id` without one. These two together are the whole of what makes the header trustworthy, and neither alone is sufficient. |

Any rich-text field uses the registry's single sanitiser allowlist.

### 8.3 Accessibility — `NFR-A11Y` *(18.4)*

| ID | Priority | Requirement |
|---|---|---|
| NFR-A11Y-1 | Must | Public pages meet WCAG 2.1 AA. |
| NFR-A11Y-2 | Must | Every interactive element is keyboard reachable and operable, with a visible focus indicator. |
| NFR-A11Y-3 | Must | Skill bars carry an accessible name and value; the rating is conveyed as text, never by bar or colour alone. |
| NFR-A11Y-4 | Must | Alt text is present on every image, enforced at upload. |
| NFR-A11Y-5 | Should | The admin panel meets the same standard. |
| NFR-A11Y-6 | Must | An embedded third-party card or badge is described rather than transcribed: the platform cannot read its contents, so the name, issuer, and every figure that matters are rendered as adjacent text. The frame itself carries an accessible name and is never the sole carrier of information. *(18.4, 9.8, 11.8)* |

The project modal is the first focus-trapped overlay in the system, and its focus contract — trap while open, focus to the close control on open, focus returned to the element that opened it on close, dialog named by its own heading — is the general one. Any overlay added later inherits it rather than defining its own.

### 8.4 Responsiveness — `NFR-RESP` *(18.3)*

| ID | Priority | Requirement |
|---|---|---|
| NFR-RESP-1 | Must | Public pages are fully usable from 320 px width upward, with no horizontal scroll. |
| NFR-RESP-2 | Must | Skill card grid collapses to a single column below 640 px. *(3.2)* |
| NFR-RESP-3 | Should | The admin panel is usable on tablet width; phone editing is not a v1 target. |

### 8.5 Availability and operations — `NFR-OPS`

| ID | Priority | Requirement |
|---|---|---|
| NFR-OPS-1 | Must | An outage of the API or database does not take down already-cached public pages. |
| NFR-OPS-2 | Must | Sync worker failures never affect public page availability. |
| NFR-OPS-3 | Should | Daily database backups with 30-day retention. |
| NFR-OPS-4 | Should | Structured logging with a request id propagated across `gateway`, `api`, and `portfolio`; `admin` is a static SPA and logs nothing server-side. The admin host originates no request id; `gateway` originates one when the inbound request carries none. |
| NFR-OPS-5 | Must | `gateway`'s configuration is deployed from the monorepo as part of a release, is reviewed as code, and is covered by the suite of NFR-SEC-1. A change to it is a change to the system, not to its environment. |
| NFR-OPS-6 | Should | The development environment reproduces the production topology: real hostnames under a subdomain delegated to loopback, a locally-trusted wildcard certificate, and the same `gateway` configuration. `localhost` and its subdomains are not sufficient. |
