# Software Requirements Specification — Portfolio Generator

**Version** 0.5 (draft) · **Date** 11 September 2026
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
- Server-rendered public portfolio at `{slug}.site.com`
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
| **Slug** | The tenant's subdomain label. `alice` → `alice.site.com`. |
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
| `api` | NestJS | `api.site.com` | Two surfaces — see below |
| `admin` | Next.js | `admin.site.com` | OAuth session required |
| `portfolio` | Next.js (SSR) | `*.site.com` wildcard | None — fully public |
| `db` | MongoDB | Internal | — |
| `storage` | S3-compatible object store | CDN-fronted | Public read, signed write |

A fourth workspace, `packages/registry`, is a shared library rather than a deployable. It compiles to dual ESM/CJS with four entrypoints — descriptors, validation, the rich-text sanitiser configuration, and the render-tree builder (FR-REG-9) — so that `api` (CJS, built with `tsc`) and the two Next.js apps consume prebuilt output rather than package source. It imports no framework, no ORM, and no React, and reads no environment: descriptors are data, and validators and the builder are pure functions. Presentation belonging to a section type — icons, components, styling — lives in the consuming app, keyed by the descriptor's identifier.

A single API server hosts **two logically separate surfaces**. **The admin surface and the public surface are two NestJS modules inside the one `api` deployable, not two services.** They share a process, a database connection pool, and a release, so neither can be deployed, scaled, or restarted without the other. That cost is accepted because the public surface sits behind the ISR cache (§2.2) and sees little traffic of its own, so a separate service would buy little.

- **Public surface** (`/public/*`) — unauthenticated, read-only, returns published content only. Tenant is resolved from the requested slug. Returns public-safe configuration — theme, SEO, the analytics measurement id or Plausible domain, and the ordered list of sections to render — because each of those is visible in the rendered page's source whether the API returns it or not. Never returns draft content, disabled sections, integration credentials, sync status or `lastError`, a tenant's user id, or any tenant's account email address — the address held in `users`, as distinct from a contact address the tenant chooses to publish in `contact`, which is content. That configuration never leaves the admin surface.
- **Admin surface** (`/admin/*`) — session-authenticated, read/write. Tenant is resolved from the session, never from a request parameter.

The two surfaces use separate controllers, separate guards, and separate response DTOs. No DTO is shared between them.

### 2.2 Request flow — public page view

1. Request arrives at `alice.site.com`.
2. `portfolio` middleware reads the `Host` header, extracts `alice`, rejects reserved labels.
3. If a valid ISR cache entry exists for that slug, it is served. No API call, no database read.
4. Otherwise `portfolio` calls `GET /public/portfolios/alice` server-side.
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

A tenant selects a preset once during onboarding. It only sets initial state; everything remains editable afterwards.

**FR-REG-8 (Must)** — A field descriptor's `required` flag is enforced at publish, not at save. Draft writes validate shape, type, and enumeration only, so a tenant may save incomplete content per §2.4. `validateForPublish` additionally enforces `required`, collection `min` and `max`, and cross-field rules, and reports every failure at once per FR-PUB-6.

**FR-REG-9 (Must)** — The registry package exports a pure builder that takes a content tree in draft shape, with the synced payload of each connected provider, and returns the render shape `{ config, data }` of §7.1. It removes sections with `enabled: false` and items with `published: false`; merges each synced payload beneath the tenant's manual values (FR-INT-4); removes every section whose merged content satisfies its descriptor's `emptyCondition`; and emits the survivors as `config.sections`, in ascending `order`, with their content under `data` keyed by type. It is the only code that produces the shape. `api` calls it at publish and at each fold of synced data (§2.3, FR-INT-15), and `admin` calls it for the live preview (FR-CFG-5) — one function deciding for all three, so the preview cannot show a section the published page omits. It is generic over descriptors: a section type added under FR-REG-3 needs no change to it.

---

## 5. Data model

MongoDB. Content is heterogeneous per section type, so sections are embedded subdocuments rather than normalised tables.

### 5.1 `users`

```
_id, provider ('github'|'google'), providerId, email, displayName,
avatarUrl, createdAt, lastLoginAt, status ('active'|'suspended')
```

Unique compound index on `(provider, providerId)`. Unique index on `email`.

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

---

## 6. Functional requirements

### 6.1 Authentication and accounts — `FR-AUTH`

| ID | Priority | Requirement |
|---|---|---|
| FR-AUTH-1 | Must | Sign-in is via GitHub OAuth or Google OAuth. No password is stored. |
| FR-AUTH-2 | Must | First successful sign-in creates a user and an unpublished portfolio, then routes to onboarding. |
| FR-AUTH-3 | Must | Sessions are httpOnly, secure, SameSite=Lax cookies scoped to `admin.site.com`, expiring after 30 days idle. |
| FR-AUTH-4 | Must | If a GitHub account is used to sign in, its OAuth token is reused for the GitHub integration rather than requiring a second authorisation. |
| FR-AUTH-5 | Should | Onboarding collects display name, desired slug, and preset in a single step. Slug availability is checked live. |
| FR-AUTH-6 | Should | A tenant can delete their account. Deletion removes the portfolio, releases the slug after a 30-day hold, and purges media within 7 days. |

### 6.2 Tenancy and addressing — `FR-TEN`

| ID | Priority | Requirement |
|---|---|---|
| FR-TEN-1 | Must | A published portfolio is served at `{slug}.site.com` over a wildcard DNS record and wildcard TLS certificate. |
| FR-TEN-2 | Must | Tenant identity for public requests derives solely from the `Host` header. |
| FR-TEN-3 | Must | An unknown, unpublished, or suspended slug returns a branded 404 with `noindex`. It must not disclose whether the slug is registered. |
| FR-TEN-4 | Must | Every admin data access is scoped by the portfolio id resolved from the session. A portfolio id supplied in a request body or path is ignored, never trusted. |
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
GET   /admin/me
GET   /admin/portfolio                       → full draft
PATCH /admin/portfolio/theme
PATCH /admin/portfolio/seo
PATCH /admin/portfolio/slug
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

**FR-API-3 (Must)** — No admin endpoint accepts a portfolio id or user id as a parameter. Scope comes from the session.

**FR-API-4 (Must)** — Write endpoints validate against the section registry and return field-level errors.

### 7.3 Internal

```
POST /internal/revalidate      → shared-secret auth, called by api → portfolio
```

---

## 8. Non-functional requirements

### 8.1 Performance — `NFR-PERF`

| ID | Priority | Requirement |
|---|---|---|
| NFR-PERF-1 | Must | A cached public page responds in under 200 ms at the edge; an uncached render completes in under 800 ms at p95. |
| NFR-PERF-2 | Must | Largest Contentful Paint under 2.5 s on a 4G connection; Cumulative Layout Shift under 0.1. |
| NFR-PERF-3 | Must | A public page render performs at most one database read and zero server-side external HTTP calls: no read when the page is served from cache, and on an uncached render exactly one — a single find on `portfolios` keyed by slug. This holds by construction rather than by effort: the published tree is stored in the shape it is served in (§5.2), so there is nothing else to read and nothing to compute. Cards and badges are fetched by the visitor's browser, are excluded from render timing, and are lazy-loaded with reserved dimensions so they cannot spend NFR-PERF-2's layout-shift budget. |
| NFR-PERF-4 | Should | The system sustains 500 concurrent public page views without degradation. |

### 8.2 Security and isolation — `NFR-SEC`

| ID | Priority | Requirement |
|---|---|---|
| NFR-SEC-1 | Must | Cross-tenant read or write is impossible through any endpoint. This is verified by an automated test suite that attempts every admin endpoint with a second tenant's identifiers. |
| NFR-SEC-2 | Must | All tenant-supplied text is escaped on render. Rich text, if permitted in any field, passes an allowlist sanitiser server-side before storage. |
| NFR-SEC-3 | Must | Integration credentials and OAuth tokens are encrypted at rest with a key held outside the database. |
| NFR-SEC-4 | Must | A strict Content Security Policy is served on public pages, permitting only the platform's own origins, the CDN, a configured analytics origin, GitHub's card service in `img-src`, and Credly's badge host in `frame-src`. No third-party origin is granted `script-src`. *(13.6, 13.9)* |
| NFR-SEC-5 | Must | Outbound requests from the sync worker are restricted against SSRF: no private ranges, no link-local addresses, redirect chains re-validated at each hop. |
| NFR-SEC-6 | Should | Content mutations are recorded in `auditLog`. |

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
| NFR-OPS-4 | Should | Structured logging with a request id propagated across all three deployables. |

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

---

## 10. Assumptions, deferred scope, and open questions

### 10.1 Assumptions

1. One portfolio per tenant. Multiple portfolios per account would change `portfolios.userId` from a unique index to a plain one and add a selection step throughout admin — cheap to add later, but not assumed now.
2. English-only content and UI in v1. No field is modelled as a translation map.
3. Object storage is S3-compatible and CDN-fronted.
4. The operator controls a wildcard DNS record and wildcard TLS certificate for `*.site.com`.
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
4. **Slug policy.** Are slugs first-come-first-served, or is there a reservation process for names matching well-known people or trademarks?
5. **Public directory.** Should published portfolios be discoverable through a platform-level index, or reachable only by direct URL?
6. **Section ordering freedom.** FR-CFG-3 allows arbitrary reordering, but requirement 6.3 states Education belongs below work and projects. Is the ordering fully free, or does the layout impose constraints the tenant cannot override?
7. **Trainings vs. achievements.** `trainings` inherits the Achievements schema verbatim, including its `type` enum — certification / award / ranking / hackathon. That enum does not describe a training well; the natural values are course, workshop, bootcamp, programme, and business §11a.2 does not ask for a type at all. Three options: (a) two section types with divergent `type` enums; (b) two section types with `type` dropped from Trainings altogether; (c) one collapsed type in which `type` distinguishes a training from an achievement, at the cost of the separate heading and the independent enable toggle. Option (a) is specified for now, with the enum unchanged, pending a decision.
8. **Certification overlap.** A certification is both an achievement (11.1) and the outcome of a training. Business §11a.4 states that a credential is listed once and never in both sections, but does not say how that is upheld: admin needs help text steering the tenant to one section or the other, or entries will be duplicated.
9. **Testimonials from LinkedIn.** Requirement 8.3 says testimonials "can be pulled from LinkedIn", but 13.4 scopes the LinkedIn import to experience and education only, and FR-INT-10 follows 13.4. The two business requirements disagree with each other. Either 13.4 widens to cover recommendations — which changes the import's scope, its permission requirements, and depends on what LinkedIn actually exposes — or 8.3's clause is dropped and testimonials stay manual. Specified as manual for now, following 13.4. This one belongs to the business document rather than to this specification.