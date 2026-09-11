# api

NestJS API for the portfolio generator: a public read-only surface and a
session-authenticated admin surface in one deployable (SRS §2.1).

**Status: skeleton.** Every route in SRS §7.1 and §7.2 is wired, validated for
shape, and documented, and every handler returns `501 Not Implemented`.

## Setup

This directory is its own npm root. `@portfolio/registry` is a `file:`
dependency consumed as built output, so build it first:

```bash
cd ../packages/registry && npm install && npm run build
cd ../../data-service && npm install
cp .env.example .env
docker compose up -d      # or point MONGODB_URI at an existing MongoDB
npm run start:dev         # http://localhost:3001
```

| Script | |
|---|---|
| `npm run build` | `tsc` to `dist/` |
| `npm run start:dev` | watch mode |
| `npm run typecheck` | |
| `npm run lint` | ESLint, then `prettier --check` |
| `npm run format` | `prettier --write` |

## API documents

| Path | Contents |
|---|---|
| `/docs/public` | Public surface only |
| `/docs/admin` | Admin surface only; not mounted in production |
| `openapi/public.json`, `openapi/admin.json` | Rewritten on every non-production boot, for the frontends |

## Decisions to revisit

- **`/docs/admin` is mounted only when `NODE_ENV !== 'production'`.** The admin
  contract is not published from production. Revisit if a staging or
  production client needs it, or once it can sit behind the session guard.
- **`POST /internal/revalidate` (§7.3) is not served here.** It belongs to
  `portfolio`; this service calls it through `Revalidator`.
- **`POST /admin/integrations/:provider/sync` returns 202.** Admin code may not
  import worker code, so a manual refresh is handed to the worker rather than
  run inline.
