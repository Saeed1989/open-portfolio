# open-portfolio

A multi-tenant portfolio generator. Anyone signs in with GitHub or Google, configures their
portfolio through an admin panel, and publishes it at `{slug}.site.com` — no code required.

> **Status: specification only.** No implementation exists yet. `spec/` is the source of truth.

## Specs

| File | Contents |
|---|---|
| [`spec/BusinessRequirements.md`](spec/BusinessRequirements.md) | The content model — what a portfolio holds, prioritised Must/Should/Could |
| [`spec/srs.md`](spec/srs.md) | The system spec — architecture, data model, `FR-*`/`NFR-*` requirements, traceability |

## Architecture

| Component | Tech | Exposure |
|---|---|---|
| `api` | NestJS | `api.site.com` — public read-only surface + session-auth admin surface |
| `admin` | Next.js | `admin.site.com` — OAuth session required |
| `portfolio` | Next.js SSR/ISR | `*.site.com` wildcard — fully public |
| `db` | MongoDB | internal |
| `storage` | S3-compatible, CDN-fronted | signed writes, public read |

The two API surfaces use separate controllers, guards, and DTOs, and share none. Admin scope
always comes from the session — never from a request parameter.

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

## Deferred from v1

Custom domains, multiple layout templates, team accounts, and tenant-supplied CSS/JS — with
reasoning in `spec/srs.md` §10.2. Six open questions are tracked in §10.3.
