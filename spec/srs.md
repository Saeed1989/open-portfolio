# Software Requirements Specification — Portfolio Generator

**Version** 0.8 (draft) · **Date** 18 September 2026
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

**Out of scope (v1)** — see §10.2 for rationale

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

Software requirements use the form `FR-<GROUP>-<n>` and `NFR-<GROUP>-<n>`. Business requirements are referenced by their original identifiers (`2.9`, `18.2`, …). §9 maps between them.

Priority follows the source document: **Must** = launch blocker, **Should** = v1 if capacity allows, **Could** = post-launch. The business document assigns priority per section across §1–§12 and per row only in §13, so a section's rating is inherited by every requirement drawn from it. Where a single requirement is deliberately scoped below its section's blanket rating — FR-SEC-PROJ-7, 8 and 9, and FR-SEC-SKILL-9 and 10 — that is this specification's judgement rather than the source document's, and is recorded here so the divergence stays visible.

**Priority attaches to the requirement, not to the feature it serves.** A requirement may outrank the section it governs, and several do: FR-INT-14 and NFR-SEC-4 are Must while `achievements` is only Should. They do not oblige the system to ship Credly badges. They bind absolutely *if* it does. Read a Must on an optional feature as conditional — not "build this before launch", but "if this ships at all, it ships this way or not at all". Security, privacy, and accessibility requirements are the usual occupants of that category, because the cost of getting them wrong does not scale down with the priority of the feature that carries them.

---

## 2. System overview

### 2.1 Deployables

| Component | Technology | Exposure | Auth |
|---|---|---|---|
| `edge` | nginx | `openfolio.site`, `admin.openfolio.site`, `*.openfolio.site` | Terminates TLS; resolves identity by subrequest — see §2.6 |
| `api` | NestJS | **Not publicly routable** — reachable from `edge` and internal services only | Three surfaces — see below |
| `admin` | Next.js | `admin.openfolio.site` | Sign-in required — holds no session of its own; see below |
| `portfolio` | Next.js (SSR) | `*.openfolio.site` wildcard | None — fully public |
| `www` | Static client-rendered SPA | `openfolio.site` (apex) | None — fully public |
| `db` | MongoDB | Internal | — |
| `redis-cache` | Redis, `allkeys-lru` | Internal | — |
| `storage` | S3-compatible object store | CDN-fronted | Public read, signed write |

`www` is the marketing site at the apex domain and the entry point to sign-up. It is built to static files and served as built: it holds no session, makes no call to `api` or to any other service, and renders no portfolio data. Its calls to action are plain links to `admin.openfolio.site`, where sign-in (FR-AUTH-1) and then the branch of FR-AUTH-7 take over. It is client-rendered, and whether that is sufficient is open (§10.3 Q10).

`edge` terminates every public connection. It is not new infrastructure: the wildcard certificate of FR-TEN-1 and the separation of the admin host from the tenant wildcard already require a reverse proxy in front of everything, and v0.7 left that proxy unnamed — which is how `gateway` came to absorb work that belonged to it. Naming it changes what is specified rather than what is deployed. Its configuration is a specified artifact, versioned in the monorepo (FR-EDGE-6, NFR-OPS-5) and part of the security boundary rather than part of the environment the system happens to run in.

A further workspace, `packages/registry`, is a shared library rather than a deployable. It compiles to dual ESM/CJS with four entrypoints — descriptors, validation, the rich-text sanitiser configuration, and the render-tree builder (FR-REG-9) — so that `api` (CJS, built with `tsc`) and the two Next.js apps consume prebuilt output rather than package source. It imports no framework, no ORM, and no React, and reads no environment: descriptors are data, and validators and the builder are pure functions. Presentation belonging to a section type — icons, components, styling — lives in the consuming app, keyed by the descriptor's identifier.

A single API server hosts **three logically separate surfaces**. **The public, admin, and auth surfaces are three NestJS module trees inside the one `api` deployable, not three services.** They share a process, a database connection pool, and a release, so none can be deployed, scaled, or restarted without the others. That cost is accepted because the public surface sits behind the ISR cache (§2.2) and sees little traffic of its own, so a separate service would buy little.

- **Public surface** (`/public/*`) — unauthenticated, read-only, returns published content only. The portfolio is resolved from the requested slug. Returns public-safe configuration — theme, SEO, the analytics measurement id or Plausible domain, and the ordered list of sections to render — because each of those is visible in the rendered page's source whether the API returns it or not. Never returns draft content, disabled sections, integration credentials, sync status or `lastError`, a tenant's user id, or any tenant's account email address — the address held in `users`, as distinct from a contact address the tenant chooses to publish in `contact`, which is content. That configuration never leaves the admin surface.
- **Admin surface** (`/admin/*`) — read/write. The tenant is resolved from the user id supplied by `edge` (FR-AUTH-12), and the tenant's portfolio, if one exists, from the tenant — never from a request parameter. It parses no cookie, performs no session lookup, and reads neither `users` nor `sessions`.
- **Auth surface** (`/auth/*`) — sign-in, sign-out, session resolution, and account state. It is the sole holder of the OAuth client secret, and the sole reader and writer of `users` and `sessions`.

The three surfaces use separate controllers, separate guards, and separate response DTOs. No DTO is shared between them, and the separation is enforced rather than observed: ESLint `import/no-restricted-paths` zones forbid one module tree from importing another's internals, one zone per surface, so three now rather than two.

Beside the three surfaces, `api` holds a **sync module** — the sync worker of §3, refreshing each integration on the schedule of FR-INT-2 and checking demo links under FR-SEC-PROJ-9. It is a set of scheduled jobs rather than a fourth surface: no controller, no route, and nothing addresses it over HTTP, so the ESLint zones above do not gain one. It is not a deployable of its own, and the schedule is the process's, not a job queue's. Two things follow from keeping it here rather than extracting it. It reaches the decrypted provider token of FR-AUTH-4 through the in-process interface of FR-AUTH-17, which is the only route into `users` there is, so no transport has to be specified for it. And the fold of FR-INT-15 — the registry's builder, the conditional write, and the revalidation of §2.3 step 8 — runs on the same code path as a publish rather than a second copy of it.

The cost is that NFR-OPS-2 no longer holds by isolation. A sync job shares a process, a connection pool, and a release with the public and admin surfaces, so what bounds it is its own timeout and backoff, not a process boundary: a sync that hangs holds a connection the admin surface wants. NFR-OPS-1 still carries the public page through it, since a cached page survives an `api` outage entirely. Extraction is available on the terms of §10.4 if that bound proves insufficient, and would then need the token transport this arrangement avoids.

The auth module is written to be extractable. Every access to `users` or `sessions` from outside it goes through a declared in-process interface (FR-AUTH-17) rather than a direct Mongoose call, so extracting it into a service of its own would be a transport change rather than a redesign. §10.4 records when that becomes worthwhile and what the work would be.

### 2.2 Request flow — public page view

1. Request arrives at `alice.openfolio.site`.
2. `portfolio` middleware reads the `Host` header, extracts `alice`, rejects reserved labels.
3. If a valid ISR cache entry exists for that slug, it is served. No API call, no database read.
4. Otherwise `portfolio` calls `GET /public/portfolios/alice` server-side. The call is made at `api`'s internal address, and since `api` is not publicly routable (§2.1) it never leaves the deployment network.
5. `api` performs one find on `portfolios`, keyed by the slug and projecting `published.config` and `published.data`, and serialises the result through the public DTO as the two-part payload of §7.1: `config` — theme, SEO, public-safe analytics, and the ordered list of sections to render — and `data`, each section's content keyed by its type. Both halves were resolved at publish (§2.3), so nothing is stripped, evaluated, or joined per request.
6. `portfolio` applies `config.theme`, `config.seo`, and `config.analytics`, then renders the layout by iterating `config.sections` in order and dispatching each entry to the component registered for its type, with `data[type]` as its content.

**The server contacts no third-party API during a page render.** Integration data it renders comes only from the copy folded into the published tree at the last successful sync or publish (§2.3, FR-INT-15), which the render reads as part of its one find.

Two features are deliberate exceptions, and they sit on the *client* side of that line. GitHub stat cards and Credly badges are stored as URLs, so the visitor's browser requests them directly from those services after the HTML has been sent *(13.6, 13.9)*. The render itself still makes no external call and caches nothing, which is precisely why neither can go stale; the price is that a slow, rate-limited, or absent third party is visible to the visitor. §6.4.6 specifies the behaviour, FR-INT-11 and FR-INT-13 the transport, and NFR-SEC-4 the content-security-policy consequence.

### 2.3 Request flow — publish

1. Tenant clicks Publish in `admin`.
2. `api` validates the draft against the section registry. Validation failures block the publish and are reported per field.
3. `api` passes the draft, with each connected provider's payload from `integrationCache`, to the registry's builder (FR-REG-9). The builder removes sections with `enabled: false` and items with `published: false` (§5.2).
4. It merges each synced payload into the section it feeds, beneath the tenant's manual values, which win (FR-INT-4). A payload marked `stale` is merged like any other: it is the last good payload, which FR-INT-3 already serves.
5. It removes every section whose merged content satisfies its `emptyCondition` (FR-CFG-2). Emptiness is judged after the merge, so a section the tenant left empty but a sync has filled survives, and a section with neither is removed (FR-INT-5).
6. It emits the survivors as `config.sections` — `{ type, order }`, in ascending order — with their content in `data`, keyed by type, and copies `theme`, `seo`, and `analytics` when configured into `config`. If no section survives, the publish is refused (FR-CFG-4).
7. In one write, the builder's output is stored as `published.config` and `published.data`, and the draft as it stood after step 3 as `published.source`; `publishedAt` is set and `version` incremented.
8. `api` calls the `portfolio` app's on-demand revalidation endpoint for that slug, using a shared secret.
9. The next public request repopulates the cache.

Everything the public read used to compute per request is decided here, once — the move FR-PUB-3 already makes for the OG image, which is generated at publish rather than per view. The tree written in step 7 is final: a render reads it and does nothing further to it.

Steps 3 to 8 also run with no tenant involved, whenever a sync brings a changed payload (FR-INT-15). The builder then starts from `published.source` rather than from the draft, step 3 has nothing left to remove, and step 7 rewrites `config` and `data` only, so a sync refreshes the integration data on the live page without publishing any edit the tenant has not. The price is that the sync worker now writes the document the public surface reads, and triggers regenerations of the public page, where before it wrote only a collection of its own.

### 2.4 Draft / publish model

The business document does not address this, but a generator needs it: a tenant must be able to leave a project half-written without it appearing live, and cache invalidation needs a discrete event to hook onto.

Every portfolio document therefore holds two content trees, `draft` and `published`. Admin reads and writes `draft` only. The public surface reads `published` only. A portfolio with no `published` tree returns 404 publicly.

### 2.5 Request flow — sign-in

1. The tenant follows the "Sign in with GitHub" link the admin panel renders, to `/api/auth/github/start`. `edge` routes `/api/auth/*` on the admin host to `api`'s `/auth/*` without an identity subrequest.
2. `api`'s auth module generates a `state` value and a PKCE verifier, stores both in a cookie scoped `Path=/api/auth`, `httpOnly`, `Secure`, `SameSite=Lax`, expiring after 10 minutes, and redirects the browser to GitHub. `SameSite=Lax` is required here rather than incidental: the callback arrives as a top-level cross-site GET navigation, which `Strict` would not accompany with the cookie.
3. GitHub returns the browser to `/api/auth/github/callback` with a code.
4. `api` verifies `state` against the cookie first, and only then exchanges the code — client secret, verifier, and redirect URI all in one process.
5. It reads the profile and verified email, upserts the user, encrypts and stores the provider token (NFR-SEC-3), and refuses a suspended user. It creates no portfolio.
6. It mints a 256-bit random session token, stores its SHA-256 hash in `sessions` (§5.8), clears the `state` cookie, and sets the session cookie: `httpOnly`, `Secure`, `SameSite=Lax`, host-only to `admin.openfolio.site`, `Path=/api` (FR-AUTH-3).
7. It redirects the browser to the admin panel, subject to FR-AUTH-15, where FR-AUTH-7 decides what the tenant sees.

Google OAuth is the same flow on the mirrored paths (FR-AUTH-1).

`Path=/api` is retained from v0.7 for the property it bought: the `admin` Next.js app is served at `/` on the same host, and so never receives the session cookie. The recorded cost is that the `__Host-` prefix requires `Path=/` and therefore cannot be used; see open question 13.

### 2.6 Request flow — authenticated admin request

1. The admin panel, a plain client, calls `/api/admin/...` on its own origin. The browser attaches the cookie automatically, but only for `/api/*`, so the admin app's own server never sees it.
2. `edge` matches the admin host exactly, then the `/api/admin/` location, and issues an `auth_request` subrequest to `api`'s `GET /auth/resolve` before proxying anything. The subrequest carries the original request's headers, including the cookie, and no body.
3. The auth module hashes the token and looks it up in `sessions`. It checks three things: the session is not revoked, it is inside the 30-day idle window, and it is inside the 90-day absolute window. The idle expiry is refreshed when more than an hour stale.
4. Any failure is a `401`. `edge` propagates it, and the admin surface is never called.
5. Success is a `204` carrying the resolved user id in an `X-User-Id` response header.
6. `edge` captures that header, **overwrites** any `X-User-Id` on the inbound request with it, and forwards the request to `api`'s `/admin/*` (FR-EDGE-4).
7. `api`'s admin guard reads `X-User-Id`, rejects the request if it is absent or malformed, takes the tenant from it (FR-TEN-4, FR-API-3), and scopes every query by it. No cookie parsing, no session lookup, no `users` read.
8. The response streams back through `edge` to the browser untouched.

**Why a header rather than a signed token.** `api` has no public DNS record and no public ingress, so only `edge` and internal services can address it; `edge` overwrites the identity header on every location it proxies, so a client-supplied value cannot survive. v0.7 rejected this arrangement on the grounds that "only the gateway calls us" is a network assumption rather than a control, and that objection is recorded here as accepted-with-cost rather than answered: the assumption is now enforced at the network layer (FR-EDGE-5) and verified by test (NFR-SEC-1), but it remains an assumption. What it buys is the deletion of a key pair, a custody requirement, an unspecified rotation procedure, and a deployable. If `api` ever becomes publicly reachable — a second client, a partner integration, a mobile app — this decision must be revisited before that happens, and the replacement is a signed assertion.

**Why `edge` relays rather than `admin` calling `api` directly.** The session cookie cannot cross to another host, and widening it to `Domain=openfolio.site` would send every tenant's admin cookie to every public portfolio page on the wildcard. So the relay sits on the admin host, where the cookie already goes. What has changed from v0.7 is that the relay is a routing rule in infrastructure that already exists, rather than an application of its own.

**One owner per collection.** `users` and `sessions` belong to `api`'s auth module. The admin and public surfaces read neither, and reach account data only through the interface of FR-AUTH-17. Revocation on account deletion (FR-AUTH-6) and on operator suspension is an in-process call into that interface.

**Per-request cost.** Two reads — `sessions` by token hash, then `portfolios` by user id — and one internal round trip from `edge` into `api` over a keepalive pool. nginx does not cache `auth_request` results, so this happens on every admin request. NFR-PERF-5 bounds it, and open question 14 records what to do if that bound is missed.

---

## 3. Actors

| Actor | Description |
|---|---|
| **Visitor** | Anonymous public viewer of a published portfolio. Read-only. |
| **Tenant** | Authenticated owner of exactly one portfolio. Full control over their own content, no visibility into any other tenant's. |
| **System operator** | Anthropic-side administrator. Can suspend a tenant, release a slug, and read logs. No content-editing UI in v1. |
| **Sync worker** | Scheduled background process performing integration refresh and demo-link health checks. |

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

Registry order is the default section order, so `trainings` ships directly after `achievements`. FR-CFG-3 continues to apply unchanged — a tenant may reorder or disable it like any other section.

`projects` is unchanged in this table. Its field schema is extended by FR-SEC-PROJ-11 with the seven modal-level fields, but its cardinality stays `collection, 3–5` and its priority stays Must: the modal changes how deeply one project can be read, not how many a portfolio may hold.

`trainings` reuses the `achievements` field schema verbatim. Per FR-REG-3 it therefore costs one registry entry and requires no schema, admin, or persistence change; the two types can be served by a single React component in `portfolio`, parameterised by label.

### 4.2 Generic structure, opinionated defaults

The business document is deliberately software-engineering-weighted — "tech stack", "repo link", "architecture diagrams". Making the system generic by stripping that specificity would produce a bland product.

**FR-REG-5 (Must)** — Section *types* and their field schemas are domain-neutral in mechanism. **FR-REG-6 (Must)** — The system ships a `software-engineer` preset that enables Hero, Projects, Skills, Contact and sets field labels, placeholder text, and skill categories (Backend, Frontend, Database, DevOps, Tools & Practices) to the source document's values. **FR-REG-7 (Could)** — Additional presets (designer, writer, researcher) reuse the same types with different labels and category defaults.

A tenant selects a preset once, on the portfolio-creation screen (FR-AUTH-5). It only sets initial state; everything remains editable afterwards.

**FR-REG-8 (Must)** — A field descriptor's `required` flag is enforced at publish, not at save. Draft writes validate shape, type, and enumeration only, so a tenant may save incomplete content per §2.4. `validateForPublish` additionally enforces `required`, collection `min` and `max`, and cross-field rules, and reports every failure at once per FR-PUB-6.

**FR-REG-9 (Must)** — The registry package exports a pure builder that takes a content tree in draft shape, with the synced payload of each connected provider, and returns the render shape `{ config, data }` of §7.1. It removes sections with `enabled: false` and items with `published: false`; merges each synced payload beneath the tenant's manual values (FR-INT-4); removes every section whose merged content satisfies its descriptor's `emptyCondition`; and emits the survivors as `config.sections`, in ascending `order`, with their content under `data` keyed by type. It is the only code that produces the shape. `api` calls it at publish and at each fold of synced data (§2.3, FR-INT-15), and `admin` calls it for the live preview (FR-CFG-5) — one function deciding for all three, so the preview cannot show a section the published page omits. It is generic over descriptors: a section type added under FR-REG-3 needs no change to it.

**FR-REG-10 (Must)** — The preset is applied at creation by the registry package, not by `api`. The package exports, beside the builder of FR-REG-9, a pure function that takes a preset id and returns the initial draft tree: one entry in `sections` per declared section type, enabled, ordered, and defaulted as the preset sets, with the preset's theme and SEO defaults and `analytics: null`. `api` calls it once, inside `POST /admin/portfolio` (§7.2), and stores its output as `draft`, with `presetId` and the current `REGISTRY_VERSION`. The reason is FR-REG-3: a preset is registry data expressed in section types, and if `api` assembled the draft from it, adding a section type or a preset would require a change to `api`. Like the builder, the function reads no environment and touches no database.

---

## 5. Data model

MongoDB. Content is heterogeneous per section type, so sections are embedded subdocuments rather than normalised tables.

### 5.1 `users`

```
_id, provider ('github'|'google'), providerId, email, displayName,
avatarUrl, createdAt, lastLoginAt, status ('active'|'suspended')
```

Unique compound index on `(provider, providerId)`. Unique index on `email`. This collection is owned solely by `api`'s auth module; the encrypted provider token stored here is reached through the interface of FR-AUTH-17 (FR-AUTH-4), never by a direct query.

### 5.2 `portfolios`

```
_id, userId (unique), slug (unique, lowercase),
status ('unpublished'|'published'|'suspended'),
registryVersion, presetId,
draft:     { sections: [...], theme: {...}, seo: {...}, analytics: {...} | null },
published: { config: {...}, data: {...}, source: {...} } | null,
publishedAt, version, createdAt, updatedAt
```

Each entry in `draft.sections`:

```
{ type, enabled: bool, order: int, content: <type-specific object> }
```

`analytics` is `{ provider ('plausible'|'ga'), id }`, where `id` is the Plausible domain or the Google Analytics measurement id, and is null until the tenant configures one. It sits in the content tree beside `theme` and `seo` because, like them, it reaches the public page only through a publish.

**The published tree is stored in the shape it is served in.** `published.config` and `published.data` are the two halves of the render payload (§7.1), written by the registry's builder (FR-REG-9) at publish and at each fold of synced data (§2.3). The public read projects those two fields and serialises them; it transforms nothing. The alternative was to store `published` in draft shape and have the public DTO assemble `config` and `data` on the way out. That keeps one shape for both trees, but puts the stripping, the `emptyCondition` evaluation, and the integration join back on the request path — the work §2.2 exists to keep off it. The served shape is stored because that is what makes the read trivial.

Its cost is that the served shape cannot be rebuilt from itself. A fold of synced data has to know which values were the tenant's, so that manual values still win (FR-INT-4), and which sections were enabled but empty at publish, so that a sync which gives one content can bring it back; the build discards both. `published.source` keeps them: the draft's enabled sections as they stood at publish, with unpublished items already removed and no synced value merged in, together with the theme, SEO, and analytics published beside them. The sync worker rebuilds from `source` rather than from `draft`, because `draft` may hold edits the tenant has not published. `source` is never served, and the public read excludes it by projection.

`version` is incremented by every write to `published`, whether publish or fold; `publishedAt` changes only on publish.

**Imported items carry their own publish state.** A Credly badge arrives from import unpublished and is promoted by the tenant *(11.7)*, so an achievements item additionally carries `published: bool`, independent of the portfolio-level draft/published trees. An unpublished item stays in `draft`; the builder removes it, so it reaches neither half of `published` nor its `source`. This is the only per-item publish flag in the model; it exists because the import cannot judge which badges are high-signal.

**Document size.** Media is referenced by asset id, never embedded, so a realistic content tree stays under 200 KB against MongoDB's 16 MB limit. The document holds three trees' worth of content — the draft, the published tree's served halves, and its `source` — and the served halves also carry folded integration payloads, whose unmerged originals still live in `integrationCache`: a GitHub statistics block and at most ten RSS posts (FR-INT-8). All of it together remains more than an order of magnitude below the cap.

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
status ('ok'|'failing'|'revoked'), lastSyncAt, lastError, consecutiveFailures
```

GitHub stat cards and Credly badges deliberately have **no** row in this collection. Both are embedded by URL and hold no credential, no token, and no refresh schedule *(13.6, 13.9)*, so a tenant who uses only cards and badges has no `integrationConnections` document at all.

### 5.5 `integrationCache`

```
_id, portfolioId, provider, payload, fetchedAt, expiresAt, stale: bool
```

Written only by the sync worker, and no longer read by the public surface: a payload reaches the page folded into the published tree (FR-INT-15), and a render reads nothing here.

It is kept rather than retired because the published tree holds each payload only merged beneath the tenant's manual values, and a merge cannot be undone — a publish needs the unmerged payload to merge against a newly edited draft. Three readers remain. Publish folds the cached payload into the tree it builds (§2.3). The admin surface shows staleness from `fetchedAt` and `stale`, and returns the payload as input to the preview (FR-CFG-5). The sync worker uses it as its working set: the last good payload, left in place when a sync fails (FR-INT-3), and the baseline a new fetch is compared against, so that an unchanged payload is never folded.

### 5.6 `linkHealth`

```
_id, portfolioId, sectionType, itemId, url,
lastCheckedAt, statusCode, state ('ok'|'broken'|'unchecked'), consecutiveFailures
```

Supports business req 2.16.

### 5.7 `auditLog`

```
_id, portfolioId, userId, action, targetPath, timestamp, ipHash
```

### 5.8 `sessions`

```
_id, tokenHash (SHA-256 of the session token), userId,
createdAt, idleExpiresAt, absoluteExpiresAt, revokedAt | null
```

Unique index on `tokenHash`. Index on `userId`, which is what serves revoking every session for one user (FR-AUTH-14).

The raw session token is never stored: the auth module stores the hash and compares hashes (FR-AUTH-10). `idleExpiresAt` carries the 30-day idle window and is refreshed in place when more than an hour stale; `absoluteExpiresAt` is fixed at creation and carries the 90-day ceiling; `revokedAt` is null until the session is revoked, and a revoked session fails resolution (FR-AUTH-11). This collection and `users` are owned solely by `api`'s auth module; the admin and public surfaces read neither (FR-AUTH-13).

---

## 6. Functional requirements

### 6.1 Authentication and accounts — `FR-AUTH`

`FR-EDGE` in §6.10 specifies the routing and identity-header rules this group depends on.

| ID | Priority | Requirement |
|---|---|---|
| FR-AUTH-1 | Must | Sign-in is via GitHub OAuth or Google OAuth. No password is stored. |
| FR-AUTH-2 | Must | First successful sign-in creates a user and nothing else. It creates no portfolio and does not route to the creation screen itself; where the tenant goes next is decided by FR-AUTH-7. |
| FR-AUTH-3 | Must | The session cookie is httpOnly, Secure, SameSite=Lax, host-only to `admin.openfolio.site`, and scoped to `Path=/api`. A session expires after 30 days idle or 90 days absolute, whichever falls first; the idle expiry is refreshed when it is more than an hour stale. |
| FR-AUTH-4 | Must | If a GitHub account is used to sign in, its OAuth token is reused for the GitHub integration rather than requiring a second authorisation. |
| FR-AUTH-5 | Should | The portfolio-creation screen, reached when an authenticated tenant has no portfolio (FR-AUTH-7), collects display name, desired slug, and preset in a single step and submits them to `POST /admin/portfolio`. Slug availability is checked live, through the session-authenticated availability endpoint (§7.2). |
| FR-AUTH-6 | Should | A tenant can delete their account. Deletion removes the portfolio, releases the slug after a 30-day hold, and purges media within 7 days. |
| FR-AUTH-7 | Must | Once authenticated — at sign-in, or on a later visit with a valid session — `admin` branches on whether the tenant has a portfolio, as reported by `GET /admin/me`: to the dashboard if one exists, to the creation screen (FR-AUTH-5) if not. A portfolio is created only by `POST /admin/portfolio`, which requires a session, and at most once per tenant: `portfolios.userId` carries a unique index (§5.2), so a second creation, concurrent or not, is refused (§7.2). |
| FR-AUTH-8 | Must | The OAuth start and callback endpoints belong to `api`'s auth module, reached through `edge` at `/api/auth/*` on the admin host (§7.4). The auth module generates a `state` value and a PKCE verifier per attempt and stores them in a cookie scoped `Path=/api/auth`, `SameSite=Lax`, expiring after 10 minutes. `state` is verified before the code is exchanged, and the cookie is cleared on completion or failure. |
| FR-AUTH-9 | Must | `api`'s auth module is the sole holder of the OAuth client secret, the PKCE verifier, and the redirect URI, and performs the code exchange itself. No inter-service call takes part in the exchange. It is refused for a suspended user. |
| FR-AUTH-10 | Must | The session token is 256 bits of cryptographic randomness, and only its SHA-256 hash is stored (§5.8). The raw token never leaves `api`'s auth module except in the cookie sent to the browser, and is never forwarded to the admin surface. |
| FR-AUTH-11 | Must | Session resolution happens in `api`'s auth module, at `GET /auth/resolve`, invoked by `edge` on every admin request before the admin surface is reached: the session must not be revoked, must be inside the 30-day idle window, and must be inside the 90-day absolute window, and its idle expiry is refreshed when more than an hour stale. Any failure is a `401`, and the admin surface is never called. Resolution reads `sessions` only. Account suspension is not checked here — it revokes the user's sessions instead (FR-AUTH-13) — so that resolution costs one read. |
| FR-AUTH-12 | Must | `edge` conveys the resolved identity to the admin surface as an `X-User-Id` request header, set from the `auth_request` subrequest's response and overwriting any inbound value (FR-EDGE-4). The admin surface rejects a request whose `X-User-Id` is absent or malformed, and accepts no other caller-identifying input from any origin. No signed token, key pair, or shared secret takes part. This requirement is valid only while `api` is not publicly routable (FR-EDGE-5); if that changes, it is replaced by a signed assertion. |
| FR-AUTH-13 | Must | `users` and `sessions` are owned by `api`'s auth module. The admin and public surfaces read and write neither, and reach account data only through the interface of FR-AUTH-17. Session invalidation on account deletion (FR-AUTH-6) and on operator suspension is an in-process call into the auth module. |
| FR-AUTH-14 | Must | `POST /auth/logout` revokes the presented session by setting `revokedAt`, clears the session cookie with matching attributes, and answers `204` whether or not the session resolved. It revokes that session only. `POST /auth/logout-all` revokes every session for the resolved user and is offered in admin as "sign out everywhere". |
| FR-AUTH-15 | Must | The post-callback redirect target is chosen from a fixed allowlist of paths within the admin origin. A `returnTo` value, if carried, is stored in the `state` cookie rather than the query string, and is rejected unless it is a relative path with no scheme, no authority, and no leading `//`. No user-supplied absolute URL is ever redirected to. |
| FR-AUTH-16 | Must | `/api/auth/*` is rate-limited at `edge`, per IP, independently of FR-API-2, with a stricter limit on start and callback than on the rest. Exceeding it answers `429` without reaching `api`. |
| FR-AUTH-17 | Must | The auth module exports a declared in-process interface — the only route by which any other module reaches `users` or `sessions`. It provides at minimum: the tenant's display fields for `GET /admin/me`; the decrypted provider token for the GitHub integration (FR-AUTH-4); and session revocation for a given user id. No module outside auth registers a Mongoose model for `users` or `sessions`, and the ESLint zone of §2.1 enforces it. |

### 6.2 Tenancy and addressing — `FR-TEN`

| ID | Priority | Requirement |
|---|---|---|
| FR-TEN-1 | Must | A published portfolio is served at `{slug}.openfolio.site` over a wildcard DNS record and wildcard TLS certificate. |
| FR-TEN-2 | Must | Tenant identity for public requests derives solely from the `Host` header. |
| FR-TEN-3 | Must | An unknown, unpublished, or suspended slug returns a branded 404 with `noindex`. It must not disclose whether the slug is registered. |
| FR-TEN-4 | Must | Every admin data access is scoped by the portfolio id resolved from the user id in the `X-User-Id` header set by `edge` (FR-AUTH-12, FR-EDGE-4). A portfolio id supplied in a request body or path is ignored, never trusted. |
| FR-TEN-5 | Must | The public surface returns only `published` content. Sections with `enabled: false` are removed when the published tree is built — at publish, by the registry's builder (FR-REG-9) — not at request time, so the stored tree never holds one and the public surface has nothing to strip before serialisation. A disabled section appears in neither `config.sections` nor `data`. |
| FR-TEN-6 | Could | Custom domain support — deferred, see §10.2. |

### 6.3 Portfolio and section configuration — `FR-CFG`

| ID | Priority | Requirement |
|---|---|---|
| FR-CFG-1 | Must | Every section can be enabled or disabled independently. *(18.2)* |
| FR-CFG-2 | Must | A section that is enabled but whose content satisfies its `emptyCondition` is omitted from the rendered page entirely. No headings, no empty state. The condition is evaluated when the published tree is built — at publish and at each fold of synced data (§2.3) — against the section's content after unpublished items are removed and synced values merged, and never at request time. An empty section is absent from both `config.sections` and `data`, so the renderer never meets one. *(18.1)* |
| FR-CFG-3 | Must | Sections are reorderable by drag or explicit ordinal; the order persists and drives render order. |
| FR-CFG-4 | Must | Publishing requires at least one enabled non-empty section. The `hero` section is enabled by default but remains toggleable — the source document's "Must" is read as *the system must support it*, not *the tenant must use it*. |
| FR-CFG-5 | Should | Admin displays a live preview of the draft, rendered by the same components as the public page and fed the same `{ config, data }` shape (§7.1). The shape is assembled in the `admin` app itself, by the registry package's builder (FR-REG-9), from the draft tree being edited and the cached integration payloads the admin surface returns with each connection's status. The preview therefore updates as the tenant types, with no round trip to `api`, and shows what a publish would produce. This keeps §2.1's rule: the builder is a pure function, not a DTO, and neither surface serialises the other's response — admin receives the draft through its own DTO and builds locally, and the public surface serialises the stored tree through its own. The preview never injects the analytics script, so a tenant's own editing does not register as visits. |
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
| FR-SEC-PROJ-6 | Must | Projects render at two depths: a card scannable in roughly 15 seconds, and the full detail in an in-page modal dialog opened by clicking that card. There is no dedicated project route, no URL change, and no deep link to a single project. The trade-off is accepted deliberately — project detail is neither deep-linkable nor separately crawlable, and in exchange the system carries no additional routes and no additional sitemap surface. Resolves open question 3. *(2.12)* |
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

**A known limitation, accepted rather than solved.** An unknown, revoked, or mistyped badge identifier is answered by Credly as though it were valid, so the frame draws nothing and the platform cannot tell that apart from one still loading. No automatic detection is possible. The tenant is the one who notices a blank badge, and FR-SEC-ACH-2 lets them delete it.

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
| FR-INT-1 | Must | The server calls no third-party API during a public page render; all external data it renders is read from `integrationCache`. Embedded cards and badges (FR-INT-11, FR-INT-13) are fetched by the visitor's browser after the response is sent, and are not part of the render. *(13.5)* |
| FR-INT-2 | Must | A scheduled worker refreshes each connection on its own interval — GitHub every 6 hours, RSS every 3 hours — with exponential backoff on failure. |
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
| FR-INT-15 | Must | A successful sync whose payload differs from the cached one writes it to `integrationCache` and then folds it into the published tree: `published.config` and `published.data` are rebuilt by the registry's builder (FR-REG-9) from `published.source` and every provider's current cached payload, and the slug is revalidated as on publish (§2.3). The fold never reads `draft`, so it cannot publish an edit the tenant has not. It is a single update conditional on the `version` it read, retried on a mismatch, so it cannot overwrite a publish or another fold that landed while it ran. A portfolio with no published tree is not written; its next publish folds the payload in. An unchanged payload writes nothing to `portfolios` and revalidates nothing. |

FR-INT-11 and FR-INT-13 are not exceptions to FR-INT-1 so much as a different category. FR-INT-1 constrains what the *server* does while assembling a response; a card or badge URL is inert content within that response, resolved later by the browser. Nothing is fetched, so nothing is cached, so FR-INT-2 and FR-INT-3 have nothing to act on — which is why these two carry no staleness story at all. What they carry instead is a visitor-visible failure mode, handled by FR-INT-12 and FR-SEC-OSS-4.

### 6.7 Theme — `FR-THM`

| ID | Priority | Requirement |
|---|---|---|
| FR-THM-1 | Must | One layout for all tenants. Configurable: accent colour, light/dark/system default, font pairing from a curated list. *(14.1, 14.2)* |
| FR-THM-2 | Must | Theme values render as CSS custom properties on the document root. No per-tenant stylesheet is generated or stored. |
| FR-THM-3 | Must | The accent colour picker rejects values failing WCAG AA contrast against both light and dark backgrounds, offering the nearest compliant shade. *(18.4)* |
| FR-THM-4 | Could | Logo or avatar reused across the site and in social previews. *(14.3)* |
| FR-THM-5 | Could | Layout density — compact or spacious — as a spacing-scale multiplier. *(14.4)* |
| FR-THM-6 | Must | Tenants cannot supply raw CSS, HTML, or JavaScript. A pasted Credly embed code is not an exception: only the badge identifier is extracted from it and the markup is discarded (FR-INT-14). |

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

### 6.10 Edge routing and identity — `FR-EDGE`

| ID | Priority | Requirement |
|---|---|---|
| FR-EDGE-1 | Must | `edge` matches the request's `Host` before anything else. `admin.openfolio.site` is matched exactly and takes precedence over the `*.openfolio.site` wildcard; the apex is matched exactly. A `Host` matching none of these is answered by closing the connection without a response. |
| FR-EDGE-2 | Must | On the admin host, `edge` routes `/api/auth/*` to `api`'s `/auth/*` without an identity subrequest; `/api/admin/*` to `api`'s `/admin/*` with the subrequest of FR-EDGE-3; and every other path to the `admin` Next.js app. No other path on `api` is reachable from any public host: `/public/*` is not routable from the admin host, and neither `/admin/*` nor `/auth/*` is routable from the wildcard host. |
| FR-EDGE-3 | Must | Before proxying any `/api/admin/*` request, `edge` issues an internal subrequest to `api`'s `GET /auth/resolve`, carrying the original request's headers and no body. A `2xx` permits the request to proceed; a `401` or `403` is propagated to the client and the admin surface is not called; any other status is a `502`. |
| FR-EDGE-4 | Must | `edge` sets `X-User-Id` on every request it proxies to `api` — from the subrequest's response header on authenticated locations, and to the empty value everywhere else. It is set unconditionally, so a client-supplied `X-User-Id` can never reach `api` on any route. |
| FR-EDGE-5 | Must | `api` has no public DNS record and no public ingress. It is reachable only from `edge` and from internal services. This is the precondition FR-AUTH-12 depends on. |
| FR-EDGE-6 | Must | `edge`'s configuration is versioned in the monorepo and is the same file in every environment, with upstream addresses supplied by environment variables. The development environment runs the same proxy with the same rules (NFR-OPS-6), because the routing rules are part of the security boundary and a rule that exists only in production is a rule that is never tested. |

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
    projects:  [ ... ],                  // a collection type: its items, in order
    skills:    [ ... ],
    ...                                  // one key per entry in config.sections, and no other
  }
}
```

`config` is everything that decides whether and how content appears, and every value in it is public-safe in §2.1's sense: theme, SEO, and the analytics id all appear in the rendered page's source whether or not the API returns them. `data` is content only — no `enabled` flag, no section `order`, nothing the renderer consults to decide whether to draw a section, which `config.sections` has already decided. A disabled or empty section is absent from both halves. A key in `data` with no matching entry in `config.sections`, or the reverse, is a defect in the builder (FR-REG-9), not a state the renderer handles.

Keying `data` by type relies on a portfolio holding at most one section of each type, which the admin routes of §7.2 already assume by addressing a section as `:type`. A second instance of one type — two galleries, say — would need a key other than its type, and this shape would change with it.

Both halves are stored in this shape (§5.2), so the endpoint's work is one find on `portfolios` and a serialisation through the public DTO.

Project detail is delivered inside `data.projects`, modal-level fields included, and is not served by an endpoint of its own. The modal opens over content the page already holds (FR-SEC-PROJ-6), so a per-project route would add a surface that nothing requests.

**FR-API-1 (Must)** — Public responses are assembled from dedicated DTOs that admit the public-safe configuration of §2.1 — theme, SEO, the analytics measurement id or Plausible domain, and the section list — alongside published content, and omit every internal field: user id, account email, draft content, `published.source`, disabled sections, integration credentials, sync status, `lastError`. The DTO admits the two halves of §7.1 and nothing else; the content inside `data` is bounded by the fields the registry declares, since draft writes are validated against them (FR-API-4) and the builder adds none.

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

**Creation.** `POST /admin/portfolio` takes `{ name, slug, preset }` — the three fields of FR-AUTH-5, `preset` being a preset id. On success it creates the portfolio with `status: 'unpublished'`, `published: null`, and `draft` as returned by the registry's preset function (FR-REG-10), and responds `201` with the draft as `GET /admin/portfolio` returns it. On any failure nothing is written:

- `422` with field-level errors (FR-API-4) for a malformed body, an unknown preset, a slug that fails format validation, or a slug on the reserved list of FR-DAT-1 (`slug_reserved`).
- `409 portfolio_exists` when the tenant already has a portfolio. The unique index on `portfolios.userId` decides it, so two concurrent requests from one tenant create one portfolio. It takes precedence over every slug error.
- `409 slug_taken`, as a field-level error on `slug`, when the slug belongs to another portfolio, is held in another portfolio's `slugHistory` (FR-DAT-2), or is in a deletion hold (FR-AUTH-6). The unique index on `slug` decides a race between two tenants, so a slug reported available a moment earlier can still collide at the write.

**Slug availability.** `GET /admin/slug-availability?slug=` requires a session and is open to any tenant, with or without a portfolio. It answers `{ slug, status }`, where `status` is `invalid`, `reserved`, `taken` — by the same rules as `409 slug_taken` — or `available`. The answer is advisory; only the write decides. No unauthenticated slug lookup exists: §7.1 offers none, and FR-TEN-3's 404 discloses nothing.

**A tenant with no portfolio.** `GET /admin/me` responds `200` with the tenant and `portfolio: null`; when a portfolio exists, `portfolio` is `{ slug, status }`. `admin` branches on this field (FR-AUTH-7). `GET /admin/portfolio` responds `404 portfolio_not_found`, and so does every other route above except `GET /admin/me`, `GET /admin/slug-availability`, and `POST /admin/portfolio`, since FR-TEN-4 has no portfolio id to scope them by.

**Slug change.** `PATCH /admin/portfolio/slug` changes the slug of an existing portfolio and does nothing else. It never creates a portfolio or sets a first slug — that is `POST /admin/portfolio` — and with no portfolio it responds `404` as above. Every successful call is a change and triggers FR-DAT-2: the old slug enters `slugHistory` and its subdomain answers with a 301. A request naming the current slug is rejected with `422 slug_unchanged` rather than accepted as a no-op, so no success skips FR-DAT-2. The new slug is validated, and collides, exactly as at creation.

**FR-API-3 (Must)** — No admin endpoint accepts a portfolio id or user id as a parameter. Scope comes from the `X-User-Id` header set by `edge` (FR-AUTH-12, FR-EDGE-4).

**FR-API-4 (Must)** — Write endpoints validate against the section registry and return field-level errors.

### 7.3 Internal

```
POST /internal/revalidate      → shared-secret auth, called by api → portfolio
GET  /auth/resolve             → subrequest target, called by edge → api
```

`POST /auth/exchange` is **Withdrawn (0.8)** — the code exchange no longer crosses a process boundary, so the endpoint and its shared secret have no purpose.

`GET /auth/resolve` is internal by routing: `edge` reaches it as an `internal` location no external request can address (FR-EDGE-3), and it is exposed on no public path. It answers `204` with `X-User-Id` on success and `401` otherwise, with no body in either case. `/internal/revalidate` belongs to `portfolio` and is unchanged. No surface of `api` accepts a caller-identity header from any origin other than the one `edge` sets and overwrites.

### 7.4 Auth (`/api/auth`, admin host)

```
GET  /api/auth/github/start      → begins sign-in (FR-AUTH-8)
GET  /api/auth/github/callback   → completes sign-in, sets the session cookie
GET  /api/auth/google/start
GET  /api/auth/google/callback
POST /api/auth/logout            → revokes the presented session (FR-AUTH-14)
POST /api/auth/logout-all        → revokes every session for the resolved user
```

`POST /api/auth/revoke-all` is **Withdrawn (0.8)** — revocation requested by another part of `api` is an in-process call (FR-AUTH-13), not an HTTP endpoint.

**The proxy rule.** On the admin host, `/api/auth/*` and `/api/admin/*` are the only proxied prefixes. Everything else is the `admin` app.

---

## 8. Non-functional requirements

### 8.1 Performance — `NFR-PERF`

| ID | Priority | Requirement |
|---|---|---|
| NFR-PERF-1 | Must | A cached public page responds in under 200 ms at the edge; an uncached render completes in under 800 ms at p95. |
| NFR-PERF-2 | Must | Largest Contentful Paint under 2.5 s on a 4G connection; Cumulative Layout Shift under 0.1. |
| NFR-PERF-3 | Must | A public page render performs at most one database read and zero server-side external HTTP calls: no read when the page is served from cache, and on an uncached render exactly one — a single find on `portfolios` keyed by slug. This holds by construction rather than by effort: the published tree is stored in the shape it is served in (§5.2), so there is nothing else to read and nothing to compute. Cards and badges are fetched by the visitor's browser, are excluded from render timing, and are lazy-loaded with reserved dimensions so they cannot spend NFR-PERF-2's layout-shift budget. |
| NFR-PERF-4 | Should | The system sustains 500 concurrent public page views without degradation. |
| NFR-PERF-5 | Should | An authenticated admin request completes in under 150 ms at p95, measured at `edge` from request receipt to response completion and therefore excluding the visitor's own network latency. The identity subrequest — `sessions` lookup, idle-expiry refresh, and response — accounts for under 15 ms at p95. Enforcing this requires request timings collected somewhere that computes percentiles; if that is not stood up before launch, this requirement is not met merely because nothing reports a violation. |

### 8.2 Security and isolation — `NFR-SEC`

| ID | Priority | Requirement |
|---|---|---|
| NFR-SEC-1 | Must | Cross-tenant read or write is impossible through any endpoint. This is verified by an automated test suite that attempts every admin endpoint with a second tenant's identifiers. The suite runs against the deployed topology through `edge`, not against the `api` process directly, because `api` cannot know which hostname the browser used. It additionally asserts, from a real browser context: that `/admin/*` and `/auth/*` are unroutable from the wildcard host; that a client-supplied `X-User-Id` does not reach `api` on any route; that the session cookie carries no `Domain` attribute and `Path=/api`; and that the cookie is not sent on a request to a tenant subdomain. |
| NFR-SEC-2 | Must | All tenant-supplied text is escaped on render. Rich text, if permitted in any field, passes an allowlist sanitiser server-side before storage. |
| NFR-SEC-3 | Must | Integration credentials and OAuth tokens are encrypted at rest with a key held outside the database. The same custody rule governs every service-to-service secret: the shared secret guarding `POST /internal/revalidate` is held outside the database and outside the deployment image, and is supplied at run time. |
| NFR-SEC-4 | Must | A strict Content Security Policy is served on public pages, permitting only the platform's own origins, the CDN, a configured analytics origin, GitHub's card service in `img-src`, and Credly's badge host in `frame-src`. No third-party origin is granted `script-src`. *(13.6, 13.9)* |
| NFR-SEC-5 | Must | Outbound requests from the sync worker are restricted against SSRF: no private ranges, no link-local addresses, redirect chains re-validated at each hop. |
| NFR-SEC-6 | Should | Content mutations are recorded in `auditLog`. |
| NFR-SEC-7 | Must | Session tokens are unguessable — 256 bits of cryptographic randomness — and are stored only as SHA-256 hashes, so a database read yields no usable session. No signing key exists in the system: identity is conveyed over a network boundary closed by construction rather than one secured by cryptography (FR-AUTH-12, NFR-SEC-8), and that trade is recorded in §2.6. |
| NFR-SEC-8 | Must | No identity-bearing request header reaches `api` from outside the deployment. `edge` sets `X-User-Id` unconditionally on every proxied location (FR-EDGE-4), and `api` is not publicly routable (FR-EDGE-5). These two together are the whole of what makes the header trustworthy, and neither alone is sufficient. |

NFR-SEC-2's rich-text clause was written against a hypothetical. FR-SEC-PROJ-12 is its first concrete instance: the three project `bodies.*` fields are the first rich text the system accepts, and they fix the allowlist — paragraph, lists, strong, emphasis, underline, line break, no attributes — applied server-side before storage. Any rich-text field added later, in any section type, inherits that same allowlist rather than negotiating its own. That inheritance holds only because the allowlist exists in one place: a single constant exported by the registry package (§2.1) and applied by `api` at write time, which a new rich-text field imports rather than declaring its own.

### 8.3 Accessibility — `NFR-A11Y` *(18.4)*

| ID | Priority | Requirement |
|---|---|---|
| NFR-A11Y-1 | Must | Public pages meet WCAG 2.1 AA. |
| NFR-A11Y-2 | Must | Every interactive element is keyboard reachable and operable, with a visible focus indicator. |
| NFR-A11Y-3 | Must | Skill bars carry an accessible name and value; the rating is conveyed as text, never by bar or colour alone. |
| NFR-A11Y-4 | Must | Alt text is present on every image, enforced at upload. |
| NFR-A11Y-5 | Should | The admin panel meets the same standard. |
| NFR-A11Y-6 | Must | An embedded third-party card or badge is described rather than transcribed: the platform cannot read its contents, so the name, issuer, and every figure that matters are rendered as adjacent text. The frame itself carries an accessible name and is never the sole carrier of information. *(18.4, 9.8, 11.8)* |

The project modal (FR-SEC-PROJ-13) is the first focus-trapped overlay in the system, and its focus contract — trap while open, focus to the close control on open, focus returned to the element that opened it on close, dialog named by its own heading — is the general one. Any overlay added later inherits it rather than defining its own.

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
| NFR-OPS-4 | Should | Structured logging with a request id propagated across `edge`, `api`, `admin`, and `portfolio`. `edge` originates the request id when the inbound request carries none. |
| NFR-OPS-5 | Must | `edge`'s configuration is deployed from the monorepo as part of a release, is reviewed as code, and is covered by the suite of NFR-SEC-1. A change to it is a change to the system, not to its environment. |
| NFR-OPS-6 | Should | The development environment reproduces the production topology: real hostnames under a subdomain delegated to loopback, a locally-trusted wildcard certificate, and the same `edge` configuration. `localhost` and its subdomains are not sufficient, because browsers refuse `Domain=` cookies on single-label domains and the cookie scoping this design depends on therefore cannot be exercised there. |

---

## 9. Traceability

Every business requirement maps to at least one software requirement, or is recorded below as unenforceable or deferred.

| Business | Software |
|---|---|
| 1.1–1.5 | FR-SEC-HERO-1 … 3 |
| 2.1–2.8 | FR-SEC-PROJ-1, 3, 5 |
| 2.9 | FR-SEC-PROJ-2 |
| 2.10 | FR-SEC-PROJ-7 |
| 2.11 | FR-REG-2 |
| 2.12 | FR-SEC-PROJ-6, FR-SEC-PROJ-10 |
| 2.13 | FR-SEC-PROJ-5 |
| 2.14 | FR-SEC-PROJ-8 (guidance only) — applied to the modal-level `bodies.role` |
| 2.15 | FR-SEC-PROJ-4 |
| 2.16 | FR-SEC-PROJ-9 |
| 2.17–2.23 | FR-SEC-PROJ-1, FR-SEC-PROJ-11 |
| 2.24 | FR-SEC-PROJ-12, NFR-SEC-2 |
| 2.25 | FR-SEC-PROJ-1 — advisory; stated in help text, not enforced programmatically |
| 2.26, 2.29 | FR-SEC-PROJ-10 |
| 2.27, 2.28, 2.30, 2.31 | FR-SEC-PROJ-13, NFR-A11Y-1, NFR-A11Y-2 |
| 2.32 | NFR-RESP-1, FR-SEC-PROJ-13 |
| 3.1–3.4 | FR-SEC-SKILL-2, 3, 4 |
| 3.5, 3.9, 3.13 | Editorial — help text only, not enforceable |
| 3.6–3.8 | FR-SEC-SKILL-5, 8 |
| 3.10 | FR-SEC-SKILL-6 |
| 3.11 | FR-SEC-SKILL-1 |
| 3.12 | FR-SEC-SKILL-10 |
| 3.14 | FR-SEC-SKILL-9 |
| 3.15 | FR-SEC-SKILL-7, NFR-A11Y-3 |
| 3.16 | FR-CFG-2, FR-SEC-SKILL-8 |
| 4.1–4.3 | FR-SEC-CON-1, 2 |
| 5.1–5.4 | FR-SEC-EXP-1, FR-SEC-EXP-2 |
| 6.1–6.3 | FR-SEC-EDU-1 |
| 7.1, 7.2 | FR-SEC-BLOG-1, FR-INT-8 |
| 7.3 | FR-CFG-6 (advisory) |
| 8.1–8.3 | FR-SEC-TEST-1 — 8.3's LinkedIn sourcing is unspecified, see open question 9 |
| 9.1–9.4 | FR-SEC-OSS-1, FR-INT-7 |
| 9.5 | FR-SEC-OSS-3 |
| 9.6, 9.7 | FR-SEC-OSS-2, 3, FR-INT-11 |
| 9.8 | FR-SEC-OSS-4, NFR-A11Y-6 |
| 10.1 | FR-SEC-SPK-1 |
| 10.2 | FR-CFG-6 (advisory) |
| 11.1–11.3 | FR-SEC-ACH-1 |
| 11.4–11.9 | FR-SEC-ACH-2 … 7 |
| 11a.1–11a.5 | FR-SEC-TRN-1 |
| 12.1, 12.2 | FR-SEC-GAL-1 |
| 13.1–13.4 | FR-INT-7 … 10 |
| 13.5 | FR-INT-1, 3, 4, 5 |
| 13.6 | FR-INT-11, NFR-SEC-4 |
| 13.7 | FR-INT-12 |
| 13.8, 13.9 | FR-INT-13, FR-SEC-ACH-3, NFR-SEC-4 |
| 13.10 | FR-INT-14, FR-THM-6 |
| 14.1, 14.2 | FR-THM-1 |
| 14.3, 14.4 | FR-THM-4, 5 |
| 15.1–15.4 | FR-PUB-1, 2, 3 |
| 16.1, 16.2 | FR-ANL-1, 2 |
| 17.1 | **Deferred** — see §10.2 |
| 17.2 | FR-PUB-2 |
| 17.3 | FR-PUB-5 |
| 18.1 | FR-CFG-2 |
| 18.2 | FR-CFG-1 |
| 18.3 | NFR-RESP-1, 2 |
| 18.4 | NFR-A11Y-1 … 4, 6 |
| 18.5 | FR-MED-4, 6, NFR-PERF-2 |
| 18.6 | FR-CFG-7 |
| 18.7 | FR-REG-1, FR-CFG-7 — every declared field is editable through generated admin forms, with no developer or agency involvement |

FR-AUTH-7, FR-AUTH-8 … 17, FR-EDGE-1 … 6, FR-REG-10, NFR-SEC-7, NFR-SEC-8, NFR-OPS-5, NFR-OPS-6, and the `www` and `edge` deployables (§2.1) trace to no business requirement. The business document describes the content of one portfolio, not how an account comes to hold one, nor how a signed-in tenant's requests are carried to it; like the rest of FR-AUTH, they originate in this specification.

---

## 10. Assumptions, deferred scope, and open questions

### 10.1 Assumptions

1. One portfolio per tenant. Multiple portfolios per account would change `portfolios.userId` from a unique index to a plain one and add a selection step throughout admin — cheap to add later, but not assumed now.
2. English-only content and UI in v1. No field is modelled as a translation map.
3. Object storage is S3-compatible and CDN-fronted.
4. The operator controls a wildcard DNS record and wildcard TLS certificate for `*.openfolio.site`.
5. Free tier only. No billing, no plan-based feature gating.

### 10.2 Deferred, with reasoning

| Item | Reason |
|---|---|
| **Custom domains (17.1)** | Requires per-tenant DNS verification, on-demand certificate issuance, renewal handling, and an apex-domain story. Typically the single largest work item in a system like this. Subdomains satisfy the addressing need for v1. |
| **Multiple layout templates** | One layout with configurable theme was chosen. Adding templates later means a second component set behind the same section registry — the registry design keeps this open. |
| **Team accounts** | No business requirement calls for it. |
| **Tenant-supplied CSS/JS** | Irreconcilable with CSP, accessibility guarantees, and the contrast enforcement in FR-THM-3. |

### 10.3 Open questions

1. **Résumé hosting.** Requirement 1.4 offers résumé download as a CTA. Is the file uploaded to the platform (adding a PDF path to media handling), or linked externally? Currently specified as uploadable, at 10 MB.
2. **Contact form.** Requirement 16.2 tracks a "contact form" goal, but no section in the source document defines one — §4 lists links only. Is a form in scope? If so it needs its own section type, spam protection, and an email delivery dependency.
3. **Project detail routing — resolved (0.3).** The modal is chosen over the dedicated page. Clicking a card opens an in-page dialog holding the full case study; there is no `/{slug}/projects/{id}` route and no URL change. The cost is accepted: project detail is not deep-linkable and not separately crawlable, and the portfolio page remains the only indexable surface. In exchange the system carries no additional routes and no additional sitemap entries. FR-SEC-PROJ-6 is rewritten accordingly, FR-SEC-PROJ-10 and 13 specify the dialog's behaviour, and the now-unnecessary `GET /public/portfolios/:slug/projects/:projectId` endpoint is removed from §7.1 in the same revision.
4. **Slug policy — enumeration resolved (0.6), reservation open.** No unauthenticated slug lookup exists anywhere: availability is answered only by the session-authenticated endpoint of §7.2, §7.1 offers no equivalent, and FR-TEN-3's 404 does not disclose whether a slug is registered. Still open: are slugs first-come-first-served, or is there a reservation process for names matching well-known people or trademarks?
5. **Public directory.** Should published portfolios be discoverable through a platform-level index, or reachable only by direct URL?
6. **Section ordering freedom.** FR-CFG-3 allows arbitrary reordering, but requirement 6.3 states Education belongs below work and projects. Is the ordering fully free, or does the layout impose constraints the tenant cannot override?
7. **Trainings vs. achievements.** `trainings` inherits the Achievements schema verbatim, including its `type` enum — certification / award / ranking / hackathon. That enum does not describe a training well; the natural values are course, workshop, bootcamp, programme, and business §11a.2 does not ask for a type at all. Three options: (a) two section types with divergent `type` enums; (b) two section types with `type` dropped from Trainings altogether; (c) one collapsed type in which `type` distinguishes a training from an achievement, at the cost of the separate heading and the independent enable toggle. Option (a) is specified for now, with the enum unchanged, pending a decision.
8. **Certification overlap.** A certification is both an achievement (11.1) and the outcome of a training. Business §11a.4 states that a credential is listed once and never in both sections, but does not say how that is upheld: admin needs help text steering the tenant to one section or the other, or entries will be duplicated.
9. **Testimonials from LinkedIn.** Requirement 8.3 says testimonials "can be pulled from LinkedIn", but 13.4 scopes the LinkedIn import to experience and education only, and FR-INT-10 follows 13.4. The two business requirements disagree with each other. Either 13.4 widens to cover recommendations — which changes the import's scope, its permission requirements, and depends on what LinkedIn actually exposes — or 8.3's clause is dropped and testimonials stay manual. Specified as manual for now, following 13.4. This one belongs to the business document rather than to this specification.
10. **Apex site rendering.** `www` (§2.1) is client-rendered, and nothing guarantees its content reaches a crawler or link unfurler that does not run JavaScript: FR-PUB-4 covers portfolio pages only. Three options: (a) accept client rendering — the page is marketing copy and the major search crawlers execute JavaScript, at the cost of empty previews wherever one does not; (b) prerender to static HTML at build time — `www` fetches nothing, so its output is fixed per build and it stays static files, at the cost of a prerender step and hydration; (c) extend FR-PUB-4, or add a requirement, to cover `www` with server-side rendering, which makes `www` a server rather than static files. Not decided.
11. **Application gateway — resolved (0.8).** There is no application gateway. Routing moves to `edge`, an nginx reverse proxy the deployment already required in order to terminate the wildcard certificate and separate the admin host from the tenant wildcard; session resolution, OAuth, and account state move into `api` as a third module tree. §2.1, §2.5, §2.6, §7.3, §7.4, the FR-AUTH block, and the new FR-EDGE group are rewritten accordingly.
12. **Signing key rotation — withdrawn (0.8).** No signing key exists. Identity is an `X-User-Id` header injected by `edge` onto a hop that is not publicly routable (FR-AUTH-12, FR-EDGE-5, NFR-SEC-8). The question returns unchanged the moment `api` becomes publicly reachable for any reason.
13. **Tenant content on the platform's registrable domain.** `alice.openfolio.site` and `admin.openfolio.site` are the same site, with two consequences the specification has not previously acknowledged. A tenant page can set `Domain=openfolio.site` cookies through `document.cookie`, which are then sent to the admin host alongside the host-only session cookie and are indistinguishable from it at the server — cookie tossing. And `SameSite=Lax` keys on site rather than origin, so it affords no protection between a tenant page and the admin host. The usual defence against the first is the `__Host-` cookie prefix, which requires `Path=/` and is therefore incompatible with FR-AUTH-3. Neither is caused by this amendment; both were equally present in v0.7. The structural fix is to serve tenant portfolios from a second registrable domain, leaving `openfolio.site` to `www`, `admin`, and internal use — the pattern `vercel.app`/`vercel.com` and `github.io`/`github.com` exist for this reason. The cost is a second domain, a second wildcard certificate, and tenant URLs that no longer carry the brand domain, the last of which is a product decision. Not decided; to be decided before launch.
14. **Identity subrequest cost.** nginx does not cache `auth_request` results, so every admin request costs one internal round trip into `api` and one indexed read of `sessions`. If NFR-PERF-5 is missed, the options are a Redis-backed session store with MongoDB as the record of truth — Redis is already in the stack, and revocation becomes a key delete — or a proxy whose external-authorization filter supports caching. Neither is specified now, because at v1 traffic neither is warranted.
15. **Account linking across providers.** FR-AUTH-1 offers GitHub and Google, and §5.1 places a unique index on `email` alongside the compound index on `(provider, providerId)`. Together they mean a Google sign-in returning an email already held by a GitHub user cannot create a second user, and nothing specifies what happens instead. Three options: link the identities onto the existing user, so that either provider signs into one account; refuse the sign-in with a message naming the original provider; or drop the unique index on `email` and allow two accounts with one address, which makes the address useless as an identifier and gives one person two portfolios. Not decided. It blocks the sign-in implementation, since the upsert cannot be written without an answer.
16. **What `redis-cache` holds.** §2.1 now lists a Redis instance as a deployable, but no requirement reads or writes it and no flow in §2.2, §2.3, or §2.6 names it. Its eviction policy is `allkeys-lru`, so whatever it holds must be reconstructible from MongoDB and nothing may be stored there alone. The candidate use is the published render payload, keyed by slug, in front of the one find of §2.2 step 4 — which would interact with three things already specified. NFR-PERF-3 bounds a render at one database read and is worded "by construction"; a cache in front makes it zero or one, and the wording would need to follow. Publish and the fold of FR-INT-15 already revalidate ISR (FR-PUB-7) and would have to invalidate this layer in the same step, or a published change would be visible on a cold ISR entry and stale on a warm Redis one. And the layer earns little where it sits: ISR already absorbs the repeat traffic, so the reads reaching it are the misses. Not decided. Until it is, the instance is specified as present and unused, which is worse than either answer.

### 10.4 Extraction seam

The auth module is a module for reasons of cost, not principle: at one engineer and pre-launch traffic, a separate deployable would buy independent deploys and independent scaling that nothing yet needs, and would cost network calls, partial-failure handling, and a shared release anyway. The boundary it would need is therefore enforced in code now — its own collections, its own guards, no shared DTOs, an ESLint zone, and FR-AUTH-17 as the only way in.

Extraction becomes worthwhile when any of these holds: a second product shares the account system; a compliance boundary requires auth to be deployed and audited separately; or auth must be patched without redeploying the content APIs. The work is then to replace FR-AUTH-17's in-process implementation with an HTTP client, move `users` and `sessions` to the new service, and repoint `edge`'s `auth_request` at it. §2.6 does not otherwise change, and neither does the admin surface.