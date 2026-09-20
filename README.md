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
| `edge` | nginx | `openfolio.site`, `admin.openfolio.site`, `*.openfolio.site` — terminates TLS, routes by host, resolves identity |
| `api` | NestJS | not publicly routable — public, admin, and auth surfaces plus a scheduled `sync` module, reachable only from `edge` |
| `admin` | Next.js | `admin.openfolio.site` — OAuth session required |
| `portfolio` | Next.js SSR/ISR | `*.openfolio.site` wildcard — fully public |
| `www` | Static SPA | `openfolio.site` apex — marketing site, fully public |
| `db` | MongoDB | internal |
| `redis-cache` | Redis, `allkeys-lru` | internal |
| `storage` | S3-compatible, CDN-fronted | signed writes, public read |
| `packages/registry` | TypeScript library | not deployed — consumed by `api`, `admin`, `portfolio` |

The three API surfaces — public, admin, and auth — use separate controllers, guards, and
DTOs, and share none. `edge` resolves the session by subrequest to the auth surface and injects
the user id as an `X-User-Id` header; admin scope always comes from that header — never from
a request parameter. `sync` is not a fourth surface and not a separate deployable: nothing
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
