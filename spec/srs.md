# Software Requirements Specification — Portfolio Generator

**Version** 0.1 (draft) · **Date** 5 September 2026
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
- Twelve section types, generic in structure, shipped with a software-engineering preset
- GitHub and RSS integrations with mandatory manual fallback
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
| **Section type** | One of twelve declared kinds (`hero`, `projects`, `skills`, …), defined in the section registry. |
| **Slug** | The tenant's subdomain label. `alice` → `alice.site.com`. |
| **Draft** | The working copy edited in admin. Not publicly visible. |
| **Published** | The immutable-until-next-publish copy served to the public. |
| **Preset** | A named starting configuration — which sections are enabled, with what defaults. |

### 1.4 Requirement identifiers

Software requirements use the form `FR-<GROUP>-<n>` and `NFR-<GROUP>-<n>`. Business requirements are referenced by their original identifiers (`2.9`, `18.2`, …). §9 maps between them.

Priority follows the source document: **Must** = launch blocker, **Should** = v1 if capacity allows, **Could** = post-launch.

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

A single API server hosts **two logically separate surfaces**:

- **Public surface** (`/public/*`) — unauthenticated, read-only, returns published content only. Tenant is resolved from the requested slug. Never returns draft content, disabled sections, integration credentials, analytics configuration, or any tenant's email address.
- **Admin surface** (`/admin/*`) — session-authenticated, read/write. Tenant is resolved from the session, never from a request parameter.

The two surfaces use separate controllers, separate guards, and separate response DTOs. No DTO is shared between them.

### 2.2 Request flow — public page view

1. Request arrives at `alice.site.com`.
2. `portfolio` middleware reads the `Host` header, extracts `alice`, rejects reserved labels.
3. If a valid ISR cache entry exists for that slug, it is served. No API call, no database read.
4. Otherwise `portfolio` calls `GET /public/portfolios/alice` server-side.
5. `api` loads the published document, strips disabled sections, and returns a render-ready payload including any cached integration data.
6. `portfolio` renders the layout, iterating the ordered section array and dispatching each entry to the component registered for its type.

**No third-party API is contacted during a page render.** Integration data comes only from the cache written by the background sync job (§6.6).

### 2.3 Request flow — publish

1. Tenant clicks Publish in `admin`.
2. `api` validates the draft against the section registry. Validation failures block the publish and are reported per field.
3. The draft is copied to the published document; `publishedAt` and `version` are set.
4. `api` calls the `portfolio` app's on-demand revalidation endpoint for that slug, using a shared secret.
5. The next public request repopulates the cache.

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

**FR-REG-2 (Must)** — Field order in the registry determines display order on the public page, identically for every item in a collection. This satisfies business req 2.11 structurally rather than by convention.

**FR-REG-3 (Must)** — Adding a new section type requires a registry entry plus one React component in `portfolio`. It must not require changes to `admin`, to the API's persistence layer, or to the database schema.

**FR-REG-4 (Should)** — Registry descriptors are versioned. A portfolio records the registry version it was authored against so that field additions do not retroactively invalidate published content.

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
| `achievements` | collection | Could | §11 |
| `gallery` | collection | Could | §12 |

### 4.2 Generic structure, opinionated defaults

The business document is deliberately software-engineering-weighted — "tech stack", "repo link", "architecture diagrams". Making the system generic by stripping that specificity would produce a bland product.

**FR-REG-5 (Must)** — Section *types* and their field schemas are domain-neutral in mechanism. **FR-REG-6 (Must)** — The system ships a `software-engineer` preset that enables Hero, Projects, Skills, Contact and sets field labels, placeholder text, and skill categories (Backend, Frontend, Database, DevOps, Tools & Practices) to the source document's values. **FR-REG-7 (Could)** — Additional presets (designer, writer, researcher) reuse the same types with different labels and category defaults.

A tenant selects a preset once during onboarding. It only sets initial state; everything remains editable afterwards.

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
draft:     { sections: [...], theme: {...}, seo: {...} },
published: { sections: [...], theme: {...}, seo: {...} } | null,
publishedAt, version, createdAt, updatedAt
```

Each entry in `sections`:

```
{ type, enabled: bool, order: int, content: <type-specific object> }
```

**Document size.** Media is referenced by asset id, never embedded, and integration payloads live in a separate collection, so a realistic portfolio stays under 200 KB against MongoDB's 16 MB limit. Both content trees together are still an order of magnitude below the cap.

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

### 5.5 `integrationCache`

```
_id, portfolioId, provider, payload, fetchedAt, expiresAt, stale: bool
```

Read by the public surface during render. Written only by the sync worker.

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
| FR-TEN-5 | Must | The public surface returns only `published` content, with `enabled: false` sections removed server-side before serialisation. |
| FR-TEN-6 | Could | Custom domain support — deferred, see §10.2. |

### 6.3 Portfolio and section configuration — `FR-CFG`

| ID | Priority | Requirement |
|---|---|---|
| FR-CFG-1 | Must | Every section can be enabled or disabled independently. *(18.2)* |
| FR-CFG-2 | Must | A section that is enabled but whose content satisfies its `emptyCondition` is omitted from the rendered page entirely. No headings, no empty state. *(18.1)* |
| FR-CFG-3 | Must | Sections are reorderable by drag or explicit ordinal; the order persists and drives render order. |
| FR-CFG-4 | Must | Publishing requires at least one enabled non-empty section. The `hero` section is enabled by default but remains toggleable — the source document's "Must" is read as *the system must support it*, not *the tenant must use it*. |
| FR-CFG-5 | Should | Admin displays a live preview of the draft, rendered by the same components as the public page. |
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
| FR-SEC-PROJ-1 | Must | Per project: title, problem, solution, tech stack (tag list), impact, role, links, screenshot. *(2.1–2.8)* |
| FR-SEC-PROJ-2 | Must | The 3–5 cap is enforced by the API, not merely advised in the UI. A sixth project is rejected. *(2.9)* |
| FR-SEC-PROJ-3 | Must | At least one link to a demo or repository is required per project, unless the project is flagged confidential. *(2.7, 2.15)* |
| FR-SEC-PROJ-4 | Must | A confidential flag suppresses the repository link requirement and displays a "confidential engagement" note in place of employer identification. *(2.15)* |
| FR-SEC-PROJ-5 | Must | Impact is a required field. Where no metric exists the tenant states what changed; the field cannot be saved empty. *(2.5, 2.13)* |
| FR-SEC-PROJ-6 | Must | Projects render at two depths — a card scannable in roughly 15 seconds, and full detail on expansion or a dedicated `/{slug}/projects/{id}` route. *(2.12)* |
| FR-SEC-PROJ-7 | Should | Category filtering across projects, with categories drawn from a tenant-editable list. Filtering is client-side over already-rendered data. *(2.10)* |
| FR-SEC-PROJ-8 | Should | Admin shows writing guidance for role and impact fields — first person, named components, no "worked on". This is guidance only; the system does not assess prose quality. *(2.14)* |
| FR-SEC-PROJ-9 | Should | The sync worker checks every project link weekly and records results in `linkHealth`. Two consecutive failures notify the tenant by email. Broken links are never auto-removed. *(2.16)* |

#### 6.4.3 Skills — `skills`

| ID | Priority | Requirement |
|---|---|---|
| FR-SEC-SKILL-1 | Must | A skill is stored once: `{ id, name, category, rating (1–10), prominent (bool), order }`. Both display tiers derive from this single array. *(3.11)* |
| FR-SEC-SKILL-2 | Must | The prominent tier renders 5–8 skills in a card grid — 2–3 columns desktop, 1 column mobile — each with name, efficiency bar, and numeric rating. *(3.1–3.3)* |
| FR-SEC-SKILL-3 | Must | The prominent count is enforced: fewer than 5 or more than 8 flagged skills blocks publish with a clear message. *(3.1)* |
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
| FR-SEC-EXP-1 | Should | Experience: company, title, start/end dates, description, accomplishment list. Individually collapsible on the public page, ordered by the tenant. *(5.1–5.4)* |
| FR-SEC-EDU-1 | Should | Education: degree, institution, graduation date, plus individually hideable GPA, coursework, scholarships, honours. Default position below experience and projects. *(6.1–6.3)* |
| FR-SEC-BLOG-1 | Should | Blog: per post title, date, summary, link — entered manually or populated by RSS sync. *(7.1, 7.2)* |
| FR-SEC-TEST-1 | Should | Testimonials: name, company, role, quote, optional photo. 2–4 entries enforced. *(8.1–8.3)* |
| FR-SEC-OSS-1 | Should | Open source: GitHub profile link, stats block (repos, stars, contributions), and 2–3 named contributions each with an optional impact figure. *(9.1–9.4)* |
| FR-SEC-SPK-1 | Could | Speaking: conference, date, title, link to video or slides. *(10.1)* |
| FR-SEC-ACH-1 | Could | Achievements: title, issuer, date, optional link, type (certification / award / ranking / hackathon). *(11.1–11.3)* |
| FR-SEC-GAL-1 | Could | Gallery: images with captions and alt text, plus embedded video by URL from an allowlist of providers. *(12.1, 12.2)* |

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
| FR-INT-1 | Must | No third-party API is called during a public page render. All external data is read from `integrationCache`. *(13.5)* |
| FR-INT-2 | Must | A scheduled worker refreshes each connection on its own interval — GitHub every 6 hours, RSS every 3 hours — with exponential backoff on failure. |
| FR-INT-3 | Must | On sync failure the previous cached payload continues to serve and is marked `stale`. The public page renders identically; staleness is visible only in admin. *(13.5)* |
| FR-INT-4 | Must | Every integration-backed field is also manually editable. Manual values take precedence over synced values when both exist. *(13.5)* |
| FR-INT-5 | Must | Where neither synced nor manual data exists, the affected section is hidden by the standard empty rule rather than rendered broken. *(13.5, 18.1)* |
| FR-INT-6 | Must | Integration credentials are encrypted at rest and are never included in any public API response. |
| FR-INT-7 | Should | GitHub: repository links and profile statistics. *(13.1)* |
| FR-INT-8 | Should | RSS: posts from Medium, Dev.to, Substack, or a self-hosted feed, capped at 10 most recent. Feed URLs are validated against SSRF — no private address ranges, no redirects to them. *(13.2)* |
| FR-INT-9 | Could | X/Twitter latest posts. *(13.3)* |
| FR-INT-10 | Could | LinkedIn import for experience and education, as a one-time populate rather than a live sync. *(13.4)* |

### 6.7 Theme — `FR-THM`

| ID | Priority | Requirement |
|---|---|---|
| FR-THM-1 | Must | One layout for all tenants. Configurable: accent colour, light/dark/system default, font pairing from a curated list. *(14.1, 14.2)* |
| FR-THM-2 | Must | Theme values render as CSS custom properties on the document root. No per-tenant stylesheet is generated or stored. |
| FR-THM-3 | Must | The accent colour picker rejects values failing WCAG AA contrast against both light and dark backgrounds, offering the nearest compliant shade. *(18.4)* |
| FR-THM-4 | Could | Logo or avatar reused across the site and in social previews. *(14.3)* |
| FR-THM-5 | Could | Layout density — compact or spacious — as a spacing-scale multiplier. *(14.4)* |
| FR-THM-6 | Must | Tenants cannot supply raw CSS, HTML, or JavaScript. |

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
| FR-ANL-1 | Should | A tenant supplies their own Plausible domain or Google Analytics measurement id; the script is injected only when configured. *(16.1)* |
| FR-ANL-2 | Should | Goal events fire on résumé download, contact link click, and GitHub link click. *(16.2)* |
| FR-ANL-3 | Must | No analytics script loads when the tenant has not configured one. The platform does not inject its own tracking into tenant pages. |

---

## 7. API surfaces

### 7.1 Public (`/public`, unauthenticated, read-only)

```
GET  /public/portfolios/:slug            → render payload for a published portfolio
GET  /public/portfolios/:slug/projects/:projectId
GET  /public/portfolios/:slug/sitemap.xml
```

**FR-API-1 (Must)** — Public responses are assembled from dedicated DTOs that omit every internal field: user id, email, draft content, disabled sections, integration credentials, sync status, analytics ids.

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
| NFR-PERF-3 | Must | A public page render performs at most one database read, and zero external HTTP calls. |
| NFR-PERF-4 | Should | The system sustains 500 concurrent public page views without degradation. |

### 8.2 Security and isolation — `NFR-SEC`

| ID | Priority | Requirement |
|---|---|---|
| NFR-SEC-1 | Must | Cross-tenant read or write is impossible through any endpoint. This is verified by an automated test suite that attempts every admin endpoint with a second tenant's identifiers. |
| NFR-SEC-2 | Must | All tenant-supplied text is escaped on render. Rich text, if permitted in any field, passes an allowlist sanitiser server-side before storage. |
| NFR-SEC-3 | Must | Integration credentials and OAuth tokens are encrypted at rest with a key held outside the database. |
| NFR-SEC-4 | Must | A strict Content Security Policy is served on public pages, permitting only the platform's own origins, the CDN, and a configured analytics origin. |
| NFR-SEC-5 | Must | Outbound requests from the sync worker are restricted against SSRF: no private ranges, no link-local addresses, redirect chains re-validated at each hop. |
| NFR-SEC-6 | Should | Content mutations are recorded in `auditLog`. |

### 8.3 Accessibility — `NFR-A11Y` *(18.4)*

| ID | Priority | Requirement |
|---|---|---|
| NFR-A11Y-1 | Must | Public pages meet WCAG 2.1 AA. |
| NFR-A11Y-2 | Must | Every interactive element is keyboard reachable and operable, with a visible focus indicator. |
| NFR-A11Y-3 | Must | Skill bars carry an accessible name and value; the rating is conveyed as text, never by bar or colour alone. |
| NFR-A11Y-4 | Must | Alt text is present on every image, enforced at upload. |
| NFR-A11Y-5 | Should | The admin panel meets the same standard. |

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
| 2.12 | FR-SEC-PROJ-6 |
| 2.13 | FR-SEC-PROJ-5 |
| 2.14 | FR-SEC-PROJ-8 (guidance only) |
| 2.15 | FR-SEC-PROJ-4 |
| 2.16 | FR-SEC-PROJ-9 |
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
| 5.1–5.4 | FR-SEC-EXP-1 |
| 6.1–6.3 | FR-SEC-EDU-1 |
| 7.1, 7.2 | FR-SEC-BLOG-1, FR-INT-8 |
| 7.3 | FR-CFG-6 (advisory) |
| 8.1–8.3 | FR-SEC-TEST-1 |
| 9.1–9.4 | FR-SEC-OSS-1, FR-INT-7 |
| 10.1 | FR-SEC-SPK-1 |
| 10.2 | FR-CFG-6 (advisory) |
| 11.1–11.3 | FR-SEC-ACH-1 |
| 12.1, 12.2 | FR-SEC-GAL-1 |
| 13.1–13.4 | FR-INT-7 … 10 |
| 13.5 | FR-INT-1, 3, 4, 5 |
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
| 18.4 | NFR-A11Y-1 … 4 |
| 18.5 | FR-MED-4, 6, NFR-PERF-2 |
| 18.6 | FR-CFG-7 |
| 18.7 | Reinterpreted as tenant isolation — NFR-SEC-1 |

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
3. **Project detail routing.** FR-SEC-PROJ-6 permits either an expandable card or a dedicated page. A dedicated page is better for SEO but adds routes and sitemap entries. Which should v1 build?
4. **Slug policy.** Are slugs first-come-first-served, or is there a reservation process for names matching well-known people or trademarks?
5. **Public directory.** Should published portfolios be discoverable through a platform-level index, or reachable only by direct URL?
6. **Section ordering freedom.** FR-CFG-3 allows arbitrary reordering, but requirement 6.3 states Education belongs below work and projects. Is the ordering fully free, or does the layout impose constraints the tenant cannot override?