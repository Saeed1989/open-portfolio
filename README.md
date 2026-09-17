# open-portfolio

A multi-tenant portfolio generator. Anyone signs in with GitHub or Google, configures their
portfolio through an admin panel, and publishes it at `{slug}.site.com` — no code required.

## Specs

| File | Contents |
|---|---|
| [`spec/BusinessRequirements.md`](spec/BusinessRequirements.md) | The content model — what a portfolio holds, prioritised Must/Should/Could |
| [`spec/srs.md`](spec/srs.md) | The system spec — architecture, data model, `FR-*`/`NFR-*` requirements, traceability |

## Architecture

| Component | Tech | Exposure |
|---|---|---|
| `edge` | nginx | `site.com`, `admin.site.com`, `*.site.com` — terminates TLS, routes by host, resolves identity |
| `api` | NestJS | not publicly routable — public, admin, and auth surfaces, reachable only from `edge` |
| `api` | NestJS | `api.site.com` — public read-only surface + session-auth + admin surface |
| `admin` | Next.js | `admin.site.com` — OAuth session required |
| `portfolio` | Next.js SSR/ISR | `*.site.com` wildcard — fully public |
| `www` | Static SPA | `site.com` apex — marketing site, fully public |
| `db` | MongoDB | internal |
| `storage` | S3-compatible, CDN-fronted | signed writes, public read |

The three API surfaces — public, admin, and auth — use separate controllers, guards, and
DTOs, and share none. `edge` resolves the session by subrequest to the auth surface and injects
the user id as an `X-User-Id` header; admin scope always comes from that header — never from
a request parameter.

## Core ideas

- **Section registry.** Twelve section types (`hero`, `projects`, `skills`, `contact`,
  `experience`, `education`, `blog`, `testimonials`, `opensource`, `speaking`, `achievements`,
  `gallery`) are declared once in a registry shared by all three apps. Admin generates its forms
  from it, the API validates against it, and the public site derives render order from it.
  A new section type = one registry entry + one React component.
- **Draft / published.** Each portfolio holds two content trees. Admin writes `draft`; the public
  surface reads `published` only. Publish validates, copies, and triggers on-demand revalidation.
- **Nothing renders empty.** Every section toggles independently, and an enabled-but-empty section
  is omitted entirely — no headings, no empty states.
- **Integrations never block a render.** GitHub and RSS data is refreshed by a background worker
  into a cache. A page render makes zero external calls; a failed sync keeps serving stale data.
  Every synced field is manually editable, and manual values win.
- **Guardrails, not suggestions.** The 3–5 project cap, the 5–8 prominent-skill count, required
  alt text, and WCAG AA accent-colour contrast are enforced by the API, not advised in the UI.

