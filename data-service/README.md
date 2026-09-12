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
| `npm run seed` | build, then upsert the fixture tenants |
| `npm run seed:reset` | build, drop the seven collections, then seed |

## Seed data

`src/seed/` holds four fixture tenants. Every id, slug and timestamp is fixed,
so a test may assert on a seeded value and a second run leaves the same state
rather than a second copy. Nothing in there may call `Date.now()`,
`Math.random()`, or `new Types.ObjectId()` with no argument.

| Tenant | State | What it is for |
|---|---|---|
| `alice` | published | The happy path, and the fixture the frontend develops against. Four projects, one confidential; twelve skills, six prominent. |
| `bob` | published | A second real tenant, so the cross-tenant isolation suite (NFR-SEC-1) has genuine ids to attempt with. Every identifying field differs from alice's. |
| `carol` | draft only | Publicly 404s (§2.4). Deliberately incomplete, so publish validation has something to fail on. |
| `dave` | suspended | FR-TEN-3. Has a complete published tree that must still 404. |

It targets `MONGODB_URI`, falling back to `mongodb://localhost:27017/portfolio`.
The script reads the environment directly and does **not** load `.env` — it is a
plain Node script, not a Nest process — so pass the variable inline if yours
differs. Media documents point at a placeholder host; no bytes are uploaded and
no storage is touched.

**Retention and TTL indexes.** None are created. §5 is silent on expiry for
every collection except `slugHistory`, whose 90 days a TTL index cannot
implement because it cannot expire an array element. The proposed values, and
the question of whether they are adopted, are Q-16 in
[`docs/data-design.md`](docs/data-design.md) — that document, not this one, is
where the open question lives.

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
