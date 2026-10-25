# open-portfolio

A multi-tenant portfolio generator. Users sign in with Google, configure their portfolio through an admin panel, and publish at `{slug}.<damin name>` — no code required.

## Quick start

**Prerequisites:** Node.js 22, MongoDB (use `data-service/docker-compose.yml` or point `MONGODB_URI` to your instance).

Each service is independent. Build the registry first, then run any combination:

```bash
# 1. Build shared registry (run once, rebuild after changes)
cd packages/registry && npm install && npm run build

# 2. Start services in separate terminals
cd data-service && npm install && cp .env.example .env && npm run start:dev    # :3001
cd gateway && npm install && cp .env.example .env && npm run dev              # :8080
cd admin-panel && npm install && npm run dev                                   # :5174
cd portfolio && npm install && npm run dev                                     # :3000
```

Admin panel: `http://localhost:5174` (sign in via Google)

**See each service's `.env.example` for setup required.**

## Architecture

| Service | Stack | Role |
|---------|-------|------|
| `gateway` | Fastify | Routes requests by host/path, terminates TLS, injects user identity |
| `data-service` (API) | NestJS | Public/admin/auth surfaces, scheduled sync module |
| `admin-panel` | Next.js | Admin SPA (`admin.openfolio.site`) |
| `portfolio` | Next.js SSR/ISR | Public portfolio view (`*.openfolio.site`) |
| `landing-page` | Static SPA | Marketing site (`openfolio.site`) |
| `packages/registry` | TypeScript | Shared schema — consumed by API, admin, and portfolio |

**Key design:**
- **Separate API surfaces** (public, admin, auth) with isolated guards, DTOs, and controllers
- **Gateway trust model** — API only trusts gateway's API key; user ID comes as a header
- **Sync never blocks render** — GitHub/RSS data cached asynchronously; manual values always win
- **Section registry pattern** — 13 section types defined once, shared across all apps
- **Draft/published split** — Admin writes draft, public reads published; one-click publish with validation
- **Guardrails, not suggestions** — Project caps, skill limits, WCAG AA contrast enforced by API

## Specs

| File | Purpose |
|------|---------|
| `spec/srs.md` | Source of truth — system requirements, FR/NFR, data model |
| `spec/architecture.md` | One-page topology and flows |
| `spec/BusinessRequirements.md` | Content model and prioritisation |

## Checks

```bash
# Type, lint, test in each service folder
npm run typecheck  # or per-service variant
npm run lint
npm run test
npm run test:e2e   # where applicable
```

Detailed setup for each service in their respective `README.md`.