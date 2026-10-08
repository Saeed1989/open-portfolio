# api

NestJS API for the portfolio generator: a public read-only surface, an admin
surface scoped by the `X-User-Id` header `edge` sets, and an auth surface, in
one deployable (SRS §2.1).

**Status: skeleton.** Every route in SRS §7.1 and §7.2 is wired, validated for
shape, and documented, and every handler returns `501 Not Implemented`.

## Setup

This directory is its own npm root. `@portfolio/registry` is a `file:`
dependency on `vendor/registry`, a committed build of `packages/registry`.
After changing the registry, rebuild and re-vendor it:

```bash
npm run vendor:registry   # builds packages/registry, copies it into vendor/registry
npm install
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
| `npm run seed:reset` | build, drop the eight collections, then seed |
| `npm run test:e2e` | every suite, against a throwaway in-memory MongoDB |

## Seed data

`src/seed/` holds the fixture tenants below. Every id, slug and timestamp is fixed,
so a test may assert on a seeded value and a second run leaves the same state
rather than a second copy. Nothing in there may call `Date.now()`,
`Math.random()`, or `new Types.ObjectId()` with no argument.

| Tenant | State | What it is for |
|---|---|---|
| `alice` | published | The happy path, and the fixture the frontend develops against. Four projects, one confidential; twelve skills, six prominent. |
| `bob` | published | A second real tenant, so the cross-tenant isolation suite (NFR-SEC-1) has genuine ids to attempt with. Every identifying field differs from alice's. |
| `carol` | draft only | Publicly 404s (§2.4). Deliberately incomplete, so publish validation has something to fail on. |
| `dave` | suspended | FR-TEN-3. Has a complete published tree that must still 404. |
| `eve` | no portfolio | The onboarding path (FR-AUTH-7): a signed-in user with no `portfolios` row. `GET /admin/me` answers `portfolio: null` and every other route but the two creation routes answers `404`. |

It targets `MONGODB_URI` and has **no default**: both scripts load `.env`
through Node's own `--env-file`, so the seed goes wherever the service goes, and
an unset variable fails the run rather than quietly filling a local database
nobody meant to use. Pass the variable inline to target anything else.

`seed:reset` **drops** the eight collections before writing. Against a shared or
hosted cluster that deletes whatever else is in that database, so check which
database `MONGODB_URI` resolves to before running it — a `mongodb+srv://` URI
with no path resolves to `test`, not to a database named after the cluster.

Media documents point at a placeholder host; no bytes are uploaded and no
storage is touched.

**Retention and TTL indexes.** None are created. §5 is silent on expiry for
every collection except `slugHistory`, whose 90 days a TTL index cannot
implement because it cannot expire an array element. The proposed values, and
the question of whether they are adopted, are Q-16 in
[`docs/data-design.md`](docs/data-design.md) — that document, not this one, is
where the open question lives.

## Auth

`src/auth/` is the auth surface (SRS §2.5, §2.6, §6.1): Google sign-in, the
access JWT, rotating refresh tokens, and `GET /auth/resolve`. It is the only
code that reads or writes `users` and `sessions`; every other module reaches
accounts through the interface in `src/auth/account-access.ts` (FR-AUTH-17),
and ESLint zones enforce that.

The server refuses to start unless these are set and valid — see
`.env.example` for the rules:

| Variable | |
|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | The Google OAuth client. The redirect URI is the public callback through `edge` |
| `AUTH_JWT_KEYS`, `AUTH_JWT_CURRENT_KID` | HS256 signing keys for the access JWT (FR-AUTH-19) |
| `API_BIND_HOST` | Interface to bind; defaults to `127.0.0.1` |

The admin surface trusts `X-User-Id` with no further proof (FR-AUTH-12), so
the process must stay reachable only from `edge` (FR-EDGE-5). There is no
dev-login route: locally, send `X-User-Id` with a seeded user id to
`/admin/*`, as `edge` would.

## API documents

| Path | Contents |
|---|---|
| `/docs/public` | Public surface only |
| `/docs/admin` | Admin surface only; not mounted in production |
| `/docs/auth` | Auth surface only; not mounted in production |
| `openapi/public.json`, `openapi/admin.json` | Rewritten on every non-production boot, for the frontends |

## Decisions to revisit

- **`/docs/admin` is mounted only when `NODE_ENV !== 'production'`.** The admin
  contract is not published from production. Revisit if a staging or
  production client needs it.
- **`POST /internal/revalidate` (§7.3) is not served here.** It belongs to
  `portfolio`; this service calls it through `Revalidator`.
- **`POST /admin/integrations/:provider/sync` returns 202.** Admin code may not
  import worker code, so a manual refresh is handed to the worker rather than
  run inline.
