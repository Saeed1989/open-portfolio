# Requirements Document

## Introduction

open-portfolio is a multi-tenant portfolio generator. Any registered user signs in with
GitHub or Google OAuth, configures their portfolio through an admin panel, and publishes
it at `{slug}.site.com` — no code required.

The system comprises three deployables (`api`, `admin`, `portfolio`), a shared section
registry (`packages/registry`), and a background sync worker. The `portfolio` Next.js 15
app is substantially built; this specification drives the remaining work: the NestJS API,
the Next.js admin panel, all persistence and storage layers, OAuth, integrations, and the
cross-cutting infrastructure that ties them together.

The requirements are organised in six phases matching the agreed task structure:

1. **Phase 1 — Shared infrastructure and registry** — the section registry as a single
   source of truth shared across all three apps, tenant data model, and configuration
2. **Phase 2 — API (NestJS)** — public and admin surfaces, persistence, media, publish
   lifecycle, and security constraints
3. **Phase 3 — Admin (Next.js)** — authenticated editing panel driven by registry
   descriptors
4. **Phase 4 — Portfolio app** — public server-rendered portfolio at `*.site.com`
5. **Phase 5 — Integrations** — GitHub, RSS, Credly, and the background sync worker
6. **Phase 6 — Cross-cutting** — performance, security, accessibility, responsiveness,
   and observability

Priority follows `spec/srs.md` §1.4: **Must** = launch blocker, **Should** = v1 if
capacity allows, **Could** = post-launch. A Must on an optional feature means: if the
feature ships, it ships this way or not at all.

---

## Glossary

- **API**: The NestJS backend, hosted at `api.site.com`. Exposes two logically separate
  surfaces — public (unauthenticated, read-only) and admin (session-authenticated,
  read/write).
- **Admin**: The Next.js admin panel at `admin.site.com`. Requires an OAuth session.
- **Portfolio app**: The Next.js SSR app serving `*.site.com`. Fully public, no auth.
- **Registry**: The `packages/registry` TypeScript package — framework-free section
  descriptors shared by all three apps. Single source of truth for section types, field
  schemas, cardinality, and validation (FR-REG-1).
- **Section type**: One of thirteen declared kinds (`hero`, `projects`, `skills`,
  `contact`, `experience`, `education`, `blog`, `testimonials`, `opensource`,
  `speaking`, `achievements`, `trainings`, `gallery`), each with a stable identifier,
  field schema, and cardinality.
- **Section instance**: A section type bound to a specific portfolio, carrying its own
  `enabled` flag, render `order`, and `content` object.
- **Tenant**: A registered user. Owns exactly one portfolio in v1.
- **Slug**: The tenant's subdomain label. `alice` → `alice.site.com`.
- **Draft**: The working content tree, readable and writable only through the admin
  surface. Never publicly visible.
- **Published**: The immutable-until-next-publish content tree served by the public
  surface.
- **Preset**: A named starting configuration — which sections are enabled, with what
  label and placeholder defaults.
- **Sync worker**: A scheduled background process that refreshes GitHub and RSS
  integration caches.
- **Integration cache**: The `integrationCache` collection in MongoDB. Written by the
  sync worker, read by the API during public renders.
- **Credly badge**: An achievement rendered as an embedded frame from Credly's service,
  stored as a badge identifier (not as markup).
- **GitHub stat card**: A GitHub-generated stats image requested by the visitor's
  browser, stored as a URL (not fetched by the server).
- **WCAG AA**: Web Content Accessibility Guidelines 2.1, Level AA.

---

## Requirements

---

### Phase 1 — Shared infrastructure and registry

---

### Requirement 1: Section registry as single source of truth

**User Story:** As a developer, I want the section registry to be the authoritative
definition of every section type so that admin forms, API validation, and portfolio
rendering all derive from the same schema without duplication.

#### Acceptance Criteria

1. THE Registry SHALL be the single source of truth: the Admin generates its editing
   forms from it, the API validates writes against it, and the Portfolio app uses it to
   determine field render order. *(FR-REG-1)*

2. THE Registry SHALL determine field display order on the public page identically for
   every item in a collection, satisfying the per-project field-order requirement
   structurally rather than by convention. *(FR-REG-2)*

3. WHEN a new section type is added to the Registry, THE Registry SHALL require only a
   new registry entry plus one React component in the Portfolio app — no changes to the
   Admin forms, API persistence layer, or database schema. *(FR-REG-3)*

4. THE Registry SHALL version its descriptors so that a portfolio records the registry
   version it was authored against, preventing field additions from retroactively
   invalidating published content. *(FR-REG-4, Should)*

5. THE Registry SHALL define section types and their field schemas as domain-neutral in
   mechanism, carrying no software-engineering-specific language in the schema
   structure. *(FR-REG-5)*

6. THE Registry SHALL ship a `software-engineer` preset that enables Hero, Projects,
   Skills, and Contact, and sets field labels, placeholder text, and skill categories
   (Backend, Frontend, Database, DevOps, Tools & Practices) to the source document's
   values. *(FR-REG-6)*

7. WHERE additional presets are configured, THE Registry SHALL support them (designer,
   writer, researcher) by reusing the same section types with different labels and
   category defaults, requiring no schema change. *(FR-REG-7, Could)*

---

### Requirement 2: Tenant data model

**User Story:** As a system operator, I want tenant accounts, portfolio documents, and
supporting collections to be modelled so that content is cleanly isolated per tenant
and the draft/publish split is enforced at the data layer.

#### Acceptance Criteria

1. THE System SHALL store each user with: `_id`, `provider` ('github'|'google'),
   `providerId`, `email`, `displayName`, `avatarUrl`, `createdAt`, `lastLoginAt`,
   `status` ('active'|'suspended'), with a unique compound index on `(provider,
   providerId)` and a unique index on `email`.

2. THE System SHALL store each portfolio with a unique `userId`, a unique lowercase
   `slug`, two content trees (`draft` and `published`), `status`
   ('unpublished'|'published'|'suspended'), `registryVersion`, `presetId`,
   `publishedAt`, `version`, `createdAt`, and `updatedAt`.

3. THE System SHALL represent each section instance within a portfolio as
   `{ type, enabled: bool, order: int, content: <type-specific object> }`.

4. THE System SHALL enforce slug uniqueness against a reserved list comprising at
   minimum: `www`, `api`, `admin`, `app`, `mail`, `static`, `cdn`, `assets`,
   `status`, `blog`, `help`, `support`, `docs`, and any operator infrastructure
   hostname. *(FR-DAT-1)*

5. WHERE a slug change is made, THE System SHALL preserve the old slug in a
   `slugHistory` array for 90 days and issue a 301 redirect from the old subdomain
   to the new one. *(FR-DAT-2, Should)*

6. THE System SHALL store media records with `_id`, `portfolioId`, `storageKey`,
   `url`, `mimeType`, `bytes`, `width`, `height`, `altText`, and `uploadedAt`, with
   all queries scoped by `portfolioId`.

7. THE System SHALL store per-tenant Credly badge achievements with an individual
   `published: bool` flag, independent of the portfolio-level draft/published split,
   so that imported badges arrive unpublished and are promoted individually.

---

### Requirement 3: Draft / publish lifecycle model

**User Story:** As a tenant, I want a draft/publish split so that I can leave content
half-written without it appearing on my live portfolio.

#### Acceptance Criteria

1. THE System SHALL maintain two content trees per portfolio — `draft` (writable via
   admin) and `published` (readable via the public surface) — with neither tree
   accessible through the other surface.

2. WHEN a portfolio has no `published` tree, THE Portfolio app SHALL return a 404
   response for that slug.

3. WHEN the tenant triggers a publish, THE API SHALL validate the draft against the
   Registry, report every validation failure at once per field (not stopping at the
   first), and only copy the draft to `published` when no failures remain.
   *(FR-PUB-6)*

4. WHEN a publish succeeds, THE API SHALL call the Portfolio app's on-demand
   revalidation endpoint using a shared secret, and THE Portfolio app SHALL reflect
   the published changes within 60 seconds. *(FR-PUB-7)*

5. WHERE an unpublish action is requested, THE API SHALL return the slug to the 404
   state without deleting the draft content. *(FR-PUB-8, Should)*

---

### Phase 2 — API (NestJS)

---

### Requirement 4: Authentication and account creation

**User Story:** As a visitor, I want to sign in with GitHub or Google so that I can
create and manage my portfolio without storing a password.

#### Acceptance Criteria

1. THE API SHALL support sign-in via GitHub OAuth and Google OAuth with no password
   stored. *(FR-AUTH-1)*

2. WHEN a user signs in for the first time, THE API SHALL create a user record and an
   unpublished portfolio document, then route the user to the onboarding flow.
   *(FR-AUTH-2)*

3. THE API SHALL issue sessions as httpOnly, secure, SameSite=Lax cookies scoped to
   `admin.site.com`, expiring after 30 days of inactivity. *(FR-AUTH-3)*

4. WHERE a GitHub account is used to sign in, THE API SHALL reuse the GitHub OAuth
   token for the GitHub integration rather than requiring a second authorisation.
   *(FR-AUTH-4)*

5. WHEN onboarding begins, THE Admin SHALL collect display name, desired slug, and
   preset selection in a single step, with live slug availability checking.
   *(FR-AUTH-5, Should)*

6. WHERE a tenant requests account deletion, THE API SHALL remove the portfolio,
   release the slug after a 30-day hold, and purge associated media within 7 days.
   *(FR-AUTH-6, Should)*

---

### Requirement 5: Public API surface

**User Story:** As a visitor, I want the portfolio page to load with complete content
in the initial HTML without making client-side API calls so that the page is fast and
fully crawlable.

#### Acceptance Criteria

1. THE API's public surface SHALL expose only `GET /public/portfolios/:slug` and
   `GET /public/portfolios/:slug/sitemap.xml`, both unauthenticated and read-only.

2. WHEN the public surface assembles a response, THE API SHALL use dedicated response
   DTOs that omit every internal field: user id, email, draft content, disabled
   sections, integration credentials, sync status, and analytics ids. *(FR-API-1)*

3. THE API SHALL strip `enabled: false` section instances from the public payload
   server-side before serialisation, so the Portfolio app receives only renderable
   sections. *(FR-TEN-5)*

4. THE API SHALL include the full project payload — card-level and modal-level fields
   — within the portfolio payload, requiring no separate project-detail endpoint.
   *(FR-SEC-PROJ-6)*

5. THE API SHALL rate-limit public endpoints per IP and apply a short-TTL edge cache.
   *(FR-API-2)*

6. WHEN a slug is unknown, unpublished, or suspended, THE API SHALL return a response
   that causes the Portfolio app to render a branded 404 with `noindex`, without
   disclosing whether the slug is registered. *(FR-TEN-3)*

---

### Requirement 6: Admin API surface

**User Story:** As a tenant, I want a fully authenticated admin API so that I can read
and write my portfolio content without any risk of accessing or modifying another
tenant's data.

#### Acceptance Criteria

1. THE API's admin surface SHALL resolve tenant identity from the session exclusively —
   never from a portfolio id or user id supplied in a request body or URL path.
   *(FR-TEN-4, FR-API-3)*

2. THE Admin API SHALL expose endpoints to: read the full draft; patch theme and SEO
   blocks; patch slug; list, toggle, reorder, and replace section content; create,
   update, and delete collection items; request signed upload URLs; delete media;
   read and manage integration connections; trigger manual sync; import Credly profile;
   add a single Credly badge; publish; unpublish; and read link health.

3. WHEN a write endpoint receives a request, THE API SHALL validate the payload
   against the Registry and return field-level errors for every failing field, not
   stopping at the first. *(FR-API-4)*

4. THE API SHALL enforce the 3–5 project cap at write time, rejecting a sixth project
   with a field-level error. *(FR-SEC-PROJ-2)*

5. THE API SHALL enforce the 2–4 testimonial cap at write time. *(FR-SEC-TEST-1)*

6. WHEN a publish is requested, THE API SHALL enforce that the `projects` section's
   items each carry all seven modal-level fields (`bodies.business`, `bodies.solution`,
   `bodies.role`, `designation`, `stackWorkedOn`, `tools`, `fullStack`) and report
   every missing field at once. *(FR-SEC-PROJ-11)*

7. WHEN a publish is requested, THE API SHALL enforce that the prominent-skill count
   is between 5 and 8 (inclusive) and report a publish-blocking error if it is not.
   *(FR-SEC-SKILL-3)*

---

### Requirement 7: Tenant isolation

**User Story:** As a tenant, I want absolute certainty that I cannot read or write
another tenant's data, and that no other tenant can access mine.

#### Acceptance Criteria

1. THE API SHALL scope every admin data access to the portfolio id resolved from the
   authenticated session, making cross-tenant access impossible through any endpoint.
   *(NFR-SEC-1, FR-TEN-4)*

2. THE System SHALL verify cross-tenant isolation through an automated test suite that
   attempts every admin endpoint using a second tenant's identifiers. *(NFR-SEC-1)*

3. THE API SHALL serve only `published` content on the public surface, with no path
   that exposes draft trees, disabled sections, or any other tenant's portfolio.
   *(FR-TEN-5)*

---

### Requirement 8: Section content validation

**User Story:** As a tenant, I want the API to enforce the business rules for each
section type so that my portfolio always meets the content standards without relying
on me to remember them.

#### Acceptance Criteria

1. THE API SHALL require at least one link (demo or repository) per project unless the
   project carries a `confidential` flag. *(FR-SEC-PROJ-3)*

2. WHEN a project carries a `confidential` flag, THE API SHALL suppress the repository
   link requirement and record a "Client work — source not public" note for display in
   place of the missing link. *(FR-SEC-PROJ-4)*

3. THE API SHALL reject an empty `impact` field on a project, enforcing that the tenant
   states at least what changed where no metric exists. *(FR-SEC-PROJ-5)*

4. THE API SHALL sanitise the three project rich-text body fields (`bodies.business`,
   `bodies.solution`, `bodies.role`) at write time using an allowlist: paragraph,
   unordered list, ordered list, list item, strong, emphasis, underline, and line
   break — with no anchors, no images, no scripts, no styles, and no attributes on
   any admitted tag. *(FR-SEC-PROJ-12)*

5. THE API SHALL reject a video embed URL in the Gallery section that does not match
   the configured allowlist of providers. *(FR-SEC-GAL-1)*

6. THE API SHALL enforce that a skill's `rating` field is an integer between 1 and 10
   inclusive.

---

### Requirement 9: Media handling

**User Story:** As a tenant, I want to upload images through a signed URL so that my
browser uploads directly to object storage, and the API never handles raw file bytes.

#### Acceptance Criteria

1. WHEN a media upload is requested, THE API SHALL issue a short-lived signed URL
   directly to object storage, never proxying file bytes through the API server.
   *(FR-MED-1)*

2. THE API SHALL accept only JPEG, PNG, WebP, SVG, and PDF (résumé only) file types,
   verifying content type from magic bytes rather than the declared Content-Type
   header. *(FR-MED-2)*

3. THE API SHALL reject uploads exceeding 10 MB per file. *(FR-MED-2)*

4. WHEN an SVG file is uploaded, THE API SHALL sanitise it to strip scripts and
   external references before storage. *(FR-MED-3)*

5. WHEN an image is uploaded, THE API SHALL generate WebP derivatives at defined
   widths so the Portfolio app can serve a responsive `srcset`. *(FR-MED-4)*

6. THE API SHALL require alt text at upload time and reject any upload attempt that
   omits it. *(FR-MED-5)*

7. THE API SHALL enforce a per-tenant storage cap of 200 MB and reject uploads that
   would exceed it. *(FR-MED-7)*

---

### Requirement 10: Theme and SEO configuration

**User Story:** As a tenant, I want to configure my portfolio's accent colour, font,
and light/dark preference, with the system enforcing colour contrast automatically so
I cannot accidentally publish an inaccessible theme.

#### Acceptance Criteria

1. THE API SHALL accept theme configuration for accent colour, light/dark/system
   default, and font pairing from a curated list. *(FR-THM-1)*

2. WHEN an accent colour value is submitted, THE API SHALL reject it if it fails WCAG
   AA contrast against either the light or dark background, and SHALL return the
   nearest compliant shade in the error response. *(FR-THM-3)*

3. THE API SHALL store theme values as CSS custom property names, generating no
   per-tenant stylesheet. *(FR-THM-2)*

4. THE API SHALL reject any request that supplies raw CSS, HTML, or JavaScript as a
   theme value. *(FR-THM-6)*

5. THE API SHALL accept per-portfolio SEO configuration: page title, meta description,
   keywords, and OG image. WHEN title and description are absent, THE API SHALL
   derive sensible defaults from hero content. *(FR-PUB-1)*

6. WHEN an OG image is absent at publish time, THE API SHALL generate one from the
   tenant's name, professional title, and accent colour. *(FR-PUB-3)*

---

### Requirement 11: Analytics configuration

**User Story:** As a tenant, I want to configure my own analytics provider so that I
can track portfolio visits without the platform injecting its own tracking.

#### Acceptance Criteria

1. THE API SHALL accept a tenant-supplied Plausible domain or Google Analytics
   measurement id as optional analytics configuration. *(FR-ANL-1)*

2. THE API SHALL ensure that no analytics script appears in the public response for
   a portfolio that has not configured one. *(FR-ANL-3)*

---

### Phase 3 — Admin (Next.js)

---

### Requirement 12: Admin panel structure and access

**User Story:** As a tenant, I want a secure admin panel at `admin.site.com` where I
can edit, preview, and publish my portfolio without touching any code.

#### Acceptance Criteria

1. THE Admin SHALL require a valid OAuth session for all routes, redirecting
   unauthenticated requests to the sign-in page.

2. THE Admin SHALL resolve tenant identity from the session and scope every API call
   to the authenticated tenant's portfolio.

3. THE Admin SHALL surface the tenant's draft portfolio state on load, with controls to
   toggle sections, reorder sections, edit content, configure theme and SEO, and
   trigger publish and unpublish actions.

4. WHEN a publish or write action returns field-level errors, THE Admin SHALL display
   every error adjacent to its field, not stopping at the first. *(FR-API-4, FR-PUB-6)*

---

### Requirement 13: Registry-driven editing forms

**User Story:** As a developer, I want admin forms to be generated from the registry
descriptors so that adding a new section type requires only a registry entry and a
portfolio component, with no admin form code written by hand.

#### Acceptance Criteria

1. THE Admin SHALL generate its editing form for each section type from the Registry's
   field descriptors, including label, kind, required flag, help text, options, and
   default values — with no hand-authored form code per section type. *(FR-REG-1,
   FR-REG-3)*

2. THE Admin SHALL render fields in the order the Registry declares them, identically
   for every item in a collection section. *(FR-REG-2)*

3. THE Admin SHALL show inline help text from the Registry descriptor at the point of
   data entry, surfacing the source document's writing guidance for fields such as
   project role and impact. *(FR-SEC-PROJ-8, FR-SEC-EXP-2)*

4. WHEN a section type has `cardinality: 'collection'`, THE Admin SHALL support
   creating, editing, reordering, and deleting individual items, with item count
   constraints derived from the Registry's `min` and `max` values.

---

### Requirement 14: Section management

**User Story:** As a tenant, I want to enable, disable, and reorder sections
independently so that my portfolio only shows the sections I choose.

#### Acceptance Criteria

1. THE Admin SHALL expose an independent enable/disable toggle per section, applying
   immediately to the draft. *(FR-CFG-1)*

2. THE Admin SHALL allow sections to be reordered by drag or explicit ordinal, with
   the new order persisting to the draft and driving render order on publish.
   *(FR-CFG-3)*

3. THE Admin SHALL surface the source document's advisory guidance — for example,
   enable Blog only when 5 or more posts exist, enable Speaking only with active
   community involvement — as non-blocking hints, not hard validation errors.
   *(FR-CFG-6)*

---

### Requirement 15: Live preview

**User Story:** As a tenant, I want to preview my draft portfolio in admin using the
same components that the public site uses so that what I see before publishing matches
what visitors will see.

#### Acceptance Criteria

1. THE Admin SHALL display a live preview of the draft, rendered using the same section
   components as the Portfolio app. *(FR-CFG-5, Should)*

2. WHEN the tenant makes a change to draft content, THE Admin SHALL update the preview
   without requiring a full page reload.

---

### Requirement 16: Content authoring efficiency

**User Story:** As a tenant, I want adding or editing a project to take under 10
minutes so that keeping my portfolio current is not a significant time investment.

#### Acceptance Criteria

1. THE Admin SHALL support adding or editing a project — including all card-level and
   modal-level fields — within 10 minutes and without requiring any layout decisions
   from the tenant. *(FR-CFG-7)*

2. THE Admin SHALL provide rich-text editing for the three project body fields
   (`bodies.business`, `bodies.solution`, `bodies.role`) restricted to the allowed
   markup: paragraphs, bulleted lists, numbered lists, bold, italic, underline, and
   line breaks — with no option to insert links, images, or arbitrary styling.
   *(FR-SEC-PROJ-12)*

---

### Phase 4 — Portfolio app (Next.js)

---

### Requirement 17: Multi-tenant routing and slug resolution

**User Story:** As a visitor, I want to reach any published portfolio at its subdomain
so that each tenant's portfolio has a clean, distinct address.

#### Acceptance Criteria

1. THE Portfolio app SHALL serve each published portfolio at `{slug}.site.com` using a
   wildcard DNS record and wildcard TLS certificate. *(FR-TEN-1)*

2. WHEN a request arrives, THE Portfolio app middleware SHALL extract the tenant slug
   from the `Host` header alone, rejecting reserved subdomain labels before routing.
   *(FR-TEN-2)*

3. WHEN the slug is unknown, unpublished, or suspended, THE Portfolio app SHALL render
   a branded 404 page with `noindex`, without disclosing whether the slug is registered.
   *(FR-TEN-3)*

4. THE Portfolio app SHALL serve a cached response within 200 ms at the edge for
   known slugs; an uncached render SHALL complete within 800 ms at p95.
   *(NFR-PERF-1)*

---

### Requirement 18: Server-side rendering and cache

**User Story:** As a visitor, I want the portfolio page to deliver complete HTML in
the first response so that it loads fast and is fully indexed by search engines.

#### Acceptance Criteria

1. THE Portfolio app SHALL deliver complete section content in the initial HTML
   response, requiring no client-side JavaScript for search engine crawlers.
   *(FR-PUB-4)*

2. WHEN rendering a page, THE Portfolio app SHALL perform at most one database read
   and zero server-side external HTTP calls. *(NFR-PERF-3)*

3. THE Portfolio app SHALL serve Open Graph and Twitter Card meta tags on every public
   page. *(FR-PUB-2)*

4. WHEN a tenant has not configured analytics, THE Portfolio app SHALL render no
   analytics script in the HTML response. *(FR-ANL-3)*

5. WHERE a tenant has configured analytics, THE Portfolio app SHALL inject only that
   tenant's Plausible domain or GA measurement id script. *(FR-ANL-1)*

6. WHEN the on-demand revalidation endpoint receives a request with a valid shared
   secret, THE Portfolio app SHALL invalidate the ISR cache for the tenant's slug so
   the next visitor receives freshly published content. *(FR-PUB-7)*

---

### Requirement 19: Section rendering

**User Story:** As a visitor, I want every portfolio section to render correctly at
any screen width with all fields in consistent order so that I can scan and compare
content efficiently.

#### Acceptance Criteria

1. THE Portfolio app SHALL dispatch each section instance to the component registered
   for its type, rendering fields in the order the Registry declares them, identically
   for every item. *(FR-REG-2)*

2. WHEN a section's `emptyCondition` is satisfied or `enabled` is false, THE Portfolio
   app SHALL omit that section entirely — no heading, no wrapper, no empty state.
   *(FR-CFG-2)*

3. THE Portfolio app SHALL theme each public page by injecting the tenant's theme
   values as CSS custom properties on the document root. *(FR-THM-2)*

4. THE Portfolio app SHALL serve the per-tenant `sitemap.xml` and `robots.txt`,
   excluding unpublished and suspended portfolios with `noindex`. *(FR-PUB-5, Should)*

---

### Requirement 20: Projects section and modal

**User Story:** As a visitor, I want to scan project cards quickly and then open a
full case study in a focused dialog so that I can get just the depth I want without
navigating away from the portfolio.

#### Acceptance Criteria

1. THE Portfolio app SHALL render each project as a card containing title, problem,
   solution, tech stack, impact, role, links, and screenshot, scannable in
   approximately 15 seconds. *(FR-SEC-PROJ-6)*

2. WHEN a project card is clicked, THE Portfolio app SHALL open an in-page modal
   dialog containing the full case study — business case, full solution, designation,
   full role, tech stack worked on, tools, and full stack — with no URL change and no
   dedicated project route. *(FR-SEC-PROJ-6, FR-SEC-PROJ-10)*

3. THE Portfolio app SHALL close the modal on the Escape key, on a click of the
   backdrop outside the dialog, or on a click of the close button. *(FR-SEC-PROJ-10)*

4. WHILE the modal is open, THE Portfolio app SHALL prevent the page behind it from
   scrolling and SHALL restore the visitor's scroll position on close. *(FR-SEC-PROJ-10)*

5. WHILE the modal is open, THE Portfolio app SHALL confine keyboard focus to the
   dialog's own focusable elements, cycling with Tab and Shift+Tab. *(FR-SEC-PROJ-13)*

6. WHEN the modal opens, THE Portfolio app SHALL move focus to the close button.
   WHEN the modal closes, THE Portfolio app SHALL return focus to the card that
   opened it. *(FR-SEC-PROJ-13)*

7. THE Portfolio app SHALL give the dialog `role="dialog"`, `aria-modal="true"`, and
   `aria-labelledby` pointing at the heading holding the project title. *(FR-SEC-PROJ-13)*

8. THE close button SHALL carry `aria-label="Close case study"` and a hit area of at
   least 44×44 px. *(FR-SEC-PROJ-13)*

9. THE modal SHALL be fully usable at 320 px width with no horizontal scrolling.
   *(FR-SEC-PROJ-10, NFR-RESP-1)*

---

### Requirement 21: Skills section

**User Story:** As a visitor, I want to see a tenant's strongest skills at a glance
and then explore the full breakdown by category so that I can quickly assess fit.

#### Acceptance Criteria

1. THE Portfolio app SHALL render 5–8 prominent skills in a card grid — 2–3 columns on
   desktop, 1 column on mobile — each card showing skill name, efficiency bar, and
   numeric rating. *(FR-SEC-SKILL-2)*

2. THE Portfolio app SHALL render all prominent-tier cards using one accent colour,
   with no per-skill colour variation. *(FR-SEC-SKILL-4)*

3. THE Portfolio app SHALL render every skill in the detailed breakdown tier, grouped
   by category, in a multi-column auto-fit layout that reflows to viewport width.
   *(FR-SEC-SKILL-5)*

4. THE Portfolio app SHALL render detailed-tier bars at a visually smaller size than
   prominent-tier bars, using a theme constant rather than a per-tenant setting.
   *(FR-SEC-SKILL-6)*

5. THE Portfolio app SHALL always render the numeric rating as text adjacent to the
   bar, ensuring the value is never conveyed by bar length or colour alone.
   *(FR-SEC-SKILL-7, NFR-A11Y-3)*

6. WHEN a skill category contains no skills, THE Portfolio app SHALL omit that
   category entirely. *(FR-SEC-SKILL-8)*

---

### Requirement 22: Contact section

**User Story:** As a visitor, I want to find the tenant's contact links without having
to search for them, with the email address protected from scrapers.

#### Acceptance Criteria

1. THE Portfolio app SHALL render the contact section with fields for email, GitHub,
   LinkedIn, X/Twitter, and personal site. *(FR-SEC-CON-1)*

2. THE Portfolio app SHALL render only links whose individual visibility toggle is
   enabled. *(FR-SEC-CON-2)*

3. THE Portfolio app SHALL assemble the email `mailto:` link client-side to obfuscate
   the address against naive scrapers. *(FR-SEC-CON-3)*

---

### Requirement 23: Open source section

**User Story:** As a visitor, I want to see a tenant's open-source activity including
real figures and optional stat cards so that I can verify claimed contributions.

#### Acceptance Criteria

1. THE Portfolio app SHALL render the tenant's GitHub profile link, typed contribution
   figures (repositories, commits over the last 12 months, pull requests,
   contributions), and up to 3 named contributions with optional impact figures.
   *(FR-SEC-OSS-1)*

2. WHERE GitHub stat card URLs are configured, THE Portfolio app SHALL render them as
   `<img>` elements that the visitor's browser fetches directly from GitHub's card
   service, with no server-side fetch. *(FR-SEC-OSS-2, FR-INT-11)*

3. THE Portfolio app SHALL NOT render the tenant's own total star count as a headline
   figure. *(FR-SEC-OSS-3)*

4. THE Portfolio app SHALL ensure every figure that matters is rendered as text
   adjacent to any card, so a card is never the sole carrier of a number.
   *(FR-SEC-OSS-4, NFR-A11Y-6)*

5. WHEN a GitHub stat card fails to load, THE Portfolio app SHALL remove that card
   from the layout rather than displaying a broken image. *(FR-INT-12)*

---

### Requirement 24: Achievements section and Credly badges

**User Story:** As a visitor, I want to see a tenant's certifications, awards, and
Credly badges in one unified list so that credentials are presented consistently
alongside each other.

#### Acceptance Criteria

1. THE Portfolio app SHALL render hand-entered achievements and Credly badge entries
   in the same ordered list, with no separate badges section. *(FR-SEC-ACH-2)*

2. WHEN a Credly badge identifier is present, THE Portfolio app SHALL render the badge
   as an embedded `<iframe>` from Credly's service, requested by the visitor's browser
   directly. *(FR-SEC-ACH-6, FR-INT-13)*

3. THE Portfolio app SHALL render the badge's name and issuer as adjacent text, because
   the embedded frame's contents cannot be read aloud by assistive technology.
   *(FR-SEC-ACH-6, NFR-A11Y-6)*

4. THE Portfolio app SHALL NOT restyle or suppress the expired state of a badge — that
   state is drawn by Credly and is the tenant's responsibility to manage.
   *(FR-SEC-ACH-7)*

---

### Phase 5 — Integrations

---

### Requirement 25: Integration architecture and fallback

**User Story:** As a visitor, I want the portfolio page to render reliably regardless
of whether any third-party integration is healthy so that a failing external service
never breaks the page.

#### Acceptance Criteria

1. THE API SHALL perform zero server-side external HTTP calls during a public page
   render; all external data it renders SHALL come from the integration cache.
   *(FR-INT-1)*

2. WHEN a sync fails, THE API SHALL continue to serve the previous cached payload,
   marking it `stale`. The public page SHALL render identically; staleness SHALL be
   visible only in admin. *(FR-INT-3)*

3. THE API SHALL make every integration-backed field manually editable, with manual
   values taking precedence over synced values when both exist. *(FR-INT-4)*

4. WHEN neither synced nor manual data exists for a section, THE Portfolio app SHALL
   hide that section by the standard empty rule rather than rendering it broken.
   *(FR-INT-5)*

5. THE API SHALL encrypt integration credentials at rest with a key held outside the
   database, and SHALL never include credentials in any public API response. *(FR-INT-6)*

---

### Requirement 26: GitHub integration

**User Story:** As a tenant, I want GitHub repository links and profile statistics to
sync automatically so that my portfolio reflects current activity without manual updates.

#### Acceptance Criteria

1. THE Sync worker SHALL refresh the GitHub integration every 6 hours with exponential
   backoff on failure. *(FR-INT-2)*

2. THE Sync worker SHALL fetch repository links and profile statistics (repositories,
   commits over the last 12 months, pull requests, contributions) and write them to
   the integration cache. *(FR-INT-7, Should)*

3. WHEN a GitHub account is used to sign in, THE API SHALL reuse the GitHub OAuth
   token for the integration without requiring a second authorisation. *(FR-AUTH-4)*

---

### Requirement 27: RSS integration

**User Story:** As a tenant, I want my blog posts to sync automatically from an RSS
feed so that new posts appear on my portfolio without manual entry.

#### Acceptance Criteria

1. THE Sync worker SHALL refresh RSS feeds every 3 hours with exponential backoff on
   failure. *(FR-INT-2)*

2. THE Sync worker SHALL cap synced blog posts at the 10 most recent entries. *(FR-INT-8, Should)*

3. WHEN a feed URL is submitted, THE API SHALL validate it against SSRF rules: no
   private address ranges, no redirects to private addresses. *(FR-INT-8)*

---

### Requirement 28: GitHub stat cards (browser-embedded)

**User Story:** As a tenant, I want to display GitHub stat cards on my portfolio
without the platform storing any credential or running any refresh job for them.

#### Acceptance Criteria

1. THE System SHALL store GitHub stat card configurations as URLs only, with no account
   connection, no token, and no refresh job. *(FR-INT-11)*

2. THE Portfolio app SHALL render stat card URLs as `<img>` elements fetched by the
   visitor's browser, not by the server. *(FR-INT-11)*

3. THE Portfolio app SHALL offer three GitHub card types: overall statistics,
   most-used languages, and contribution streak. The tenant SHALL choose which appear;
   statistics and languages SHALL be enabled by default. *(FR-SEC-OSS-2)*

4. THE Portfolio app SHALL request the statistics card with the star count suppressed.
   *(FR-SEC-OSS-3)*

5. WHEN a card fails to load, THE Portfolio app SHALL remove it from the layout rather
   than displaying a broken image, while the section continues to render from typed
   figures and the profile link. *(FR-INT-12)*

---

### Requirement 29: Credly badge integration

**User Story:** As a tenant, I want to add Credly badges individually or by bulk
import, with imported badges arriving unpublished so that I can curate before anything
goes live.

#### Acceptance Criteria

1. THE Admin SHALL provide two ways to add a Credly badge: bulk import from a public
   Credly profile URL, or paste of a single badge's embed code. *(FR-SEC-ACH-3)*

2. WHEN a Credly embed code is pasted, THE API SHALL extract only the badge identifier
   and discard the pasted markup — never storing or re-injecting it. *(FR-INT-14)*

3. WHEN a bulk import is triggered, THE API SHALL add only badges not already present
   in the achievements list, leaving existing items — including any the tenant has
   edited — untouched. *(FR-SEC-ACH-4)*

4. WHEN badges are imported, THE API SHALL mark each badge as unpublished so the
   tenant reviews and promotes them individually before they appear on the live
   portfolio. *(FR-SEC-ACH-5)*

5. THE System SHALL store only the Credly badge identifier — no credential, no token,
   no refresh job. *(FR-INT-13)*

---

### Requirement 30: Demo link health checking

**User Story:** As a tenant, I want to be notified when a project demo or repo link
breaks so that visitors never encounter a dead link.

#### Acceptance Criteria

1. THE Sync worker SHALL check every project link weekly and record the result in
   `linkHealth`. *(FR-SEC-PROJ-9, Should)*

2. WHEN two consecutive link checks fail for the same URL, THE Sync worker SHALL
   notify the tenant by email. *(FR-SEC-PROJ-9, Should)*

3. THE Sync worker SHALL never automatically remove a broken link — the tenant decides
   whether to replace or remove it. *(FR-SEC-PROJ-9)*

---

### Phase 6 — Cross-cutting requirements

---

### Requirement 31: Performance

**User Story:** As a visitor, I want the portfolio to load quickly and remain stable
during layout so that I get a good reading experience on any connection.

#### Acceptance Criteria

1. THE Portfolio app SHALL respond in under 200 ms at the edge for a cached page, and
   under 800 ms at p95 for an uncached render. *(NFR-PERF-1)*

2. THE Portfolio app SHALL achieve a Largest Contentful Paint under 2.5 s and a
   Cumulative Layout Shift under 0.1 on a 4G connection. *(NFR-PERF-2)*

3. THE Portfolio app SHALL serve images with a responsive `srcset` from WebP
   derivatives and with explicit dimensions to prevent layout shift. *(FR-MED-4,
   FR-MED-6)*

4. THE Portfolio app SHALL lazy-load media below the fold, reserving dimensions so
   that off-screen images spend no layout-shift budget. *(FR-MED-6, NFR-PERF-3)*

5. WHILE the stat cards and Credly badge frames are loading, THE Portfolio app SHALL
   reserve their layout dimensions so they cannot shift content as they resolve.
   *(NFR-PERF-3)*

6. THE System SHALL sustain 500 concurrent public page views without performance
   degradation. *(NFR-PERF-4, Should)*

---

### Requirement 32: Security

**User Story:** As a system operator, I want the platform to enforce strict security
boundaries so that tenants cannot harm each other or inject malicious content into
visitor browsers.

#### Acceptance Criteria

1. THE API SHALL escape all tenant-supplied text on render; rich-text fields SHALL
   pass an allowlist sanitiser server-side before storage. *(NFR-SEC-2)*

2. THE API SHALL encrypt integration credentials and OAuth tokens at rest with a key
   held outside the database. *(NFR-SEC-3)*

3. THE Portfolio app SHALL serve a strict Content Security Policy on public pages,
   permitting only: the platform's own origins, the CDN, a configured analytics
   origin, GitHub's card service in `img-src`, and Credly's badge host in `frame-src`,
   with no third-party origin granted `script-src`. *(NFR-SEC-4)*

4. THE Sync worker SHALL validate all outbound URLs against SSRF rules: no private
   address ranges, no link-local addresses, with redirect chains re-validated at each
   hop. *(NFR-SEC-5)*

5. WHEN content mutations occur, THE API SHALL record them in the audit log.
   *(NFR-SEC-6, Should)*

6. THE Admin SHALL transmit no tenant credentials, portfolio ids, or user ids in URL
   paths — all scope SHALL derive from the session. *(FR-API-3)*

---

### Requirement 33: Accessibility (WCAG 2.1 AA)

**User Story:** As a visitor using assistive technology, I want the portfolio to be
fully keyboard-navigable and correctly described so that I can access all content
without visual perception.

#### Acceptance Criteria

1. THE Portfolio app SHALL meet WCAG 2.1 AA on all public pages. *(NFR-A11Y-1)*

2. THE Portfolio app SHALL make every interactive element keyboard-reachable and
   operable with a visible focus indicator. *(NFR-A11Y-2)*

3. THE Portfolio app SHALL give each skill bar an accessible name and value; the
   numeric rating SHALL be conveyed as text, never by bar length or colour alone.
   *(NFR-A11Y-3)*

4. THE Portfolio app SHALL require alt text on every image, and THE API SHALL enforce
   this at upload time. *(NFR-A11Y-4)*

5. THE Portfolio app SHALL describe each embedded GitHub card or Credly badge with
   adjacent text carrying the name, issuer, and every figure that matters, because the
   frame's or image's contents cannot be read aloud. The frame SHALL carry an
   accessible name and SHALL NOT be the sole carrier of any information.
   *(NFR-A11Y-6)*

6. THE Admin SHALL meet WCAG 2.1 AA. *(NFR-A11Y-5, Should)*

7. THE Portfolio app SHALL enforce the project modal's focus contract as specified in
   Requirement 4.4 acceptance criteria 5–8. *(NFR-A11Y-1, NFR-A11Y-2)*

---

### Requirement 34: Responsiveness

**User Story:** As a visitor on a mobile device, I want the portfolio to be fully
usable at narrow widths so that I can read and navigate all content without horizontal
scrolling.

#### Acceptance Criteria

1. THE Portfolio app SHALL be fully usable from 320 px width upward with no horizontal
   scrolling on any section. *(NFR-RESP-1)*

2. THE Portfolio app SHALL collapse the skills card grid to a single column below
   640 px. *(NFR-RESP-2)*

3. THE Admin SHALL be usable at tablet width; phone-width editing is not a v1 target.
   *(NFR-RESP-3, Should)*

---

### Requirement 35: Availability and operations

**User Story:** As a visitor, I want cached portfolio pages to remain available even
when the API or database is down so that an infrastructure incident does not take
portfolios offline.

#### Acceptance Criteria

1. WHEN the API or database is unavailable, THE Portfolio app SHALL continue to serve
   already-cached pages without degradation. *(NFR-OPS-1)*

2. WHEN the sync worker fails, THE Portfolio app SHALL continue to serve the stale
   cached payload without affecting public page availability. *(NFR-OPS-2)*

3. THE System SHALL retain daily database backups for 30 days. *(NFR-OPS-3, Should)*

4. THE System SHALL emit structured logs with a request id propagated across the API,
   Admin, and Portfolio app. *(NFR-OPS-4, Should)*
