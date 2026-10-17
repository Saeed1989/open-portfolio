# admin

The admin panel: base app, tokens, field system, and the registry-driven
form renderer.

A pure client-rendered React SPA: Vite + React + TypeScript strict +
Tailwind v4, built to static files. It has no server of its own, holds no
session, parses no cookie, and makes no server-side call to `api`. Every call
goes to `/api/admin/*` or `/api/auth/*` on its own origin, where `gateway` takes
over.

## Running it

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:5174
npm run build        # static files in dist/, then the bundle check
npm run typecheck && npm run lint && npm test
```

In development the dev server is the admin host. It serves the app
and forwards `/api/*` to `GATEWAY_ORIGIN` by the one rule in
`admin-host/api-proxy.ts`: method, path, query, body and `Cookie`
unchanged; status, `Set-Cookie` and `Location` unchanged; no redirect followed,
nothing cached, no cookie rewritten. There is no mock server and no dev
identity: the proxy sets neither `X-User-Id` nor `X-Api-Key` and holds no
secret, and sign-in is real, through `gateway`.

The dev server runs on **plain HTTP on localhost**, and needs no certificate
and no hosts entry. Run `api` and `gateway` as `../README.md`
describes, with `gateway` on `http://gateway.localhost:8080`, and open
`http://localhost:5174`. `api`'s `GOOGLE_REDIRECT_URI` is the admin host's
origin, not `gateway`'s — `http://localhost:5174/api/auth/google/callback` —
and the same URI is registered on the Google OAuth client. `api` has no
`ADMIN_ORIGIN`: its post-sign-in redirects are relative paths. The session
cookies are `Secure`, which browsers accept over plain HTTP on `localhost` and
nowhere else, so this mode works only at that name.

Without `.env.local` at all, the dev server is the app alone with no API,
which is enough for `/dev/fields`.

`npm run build` ends with `scripts/check-bundle.mjs` (also `npm run
check:bundle`), which fails if `dist/` holds `X-Api-Key`, `X-User-Id`,
`gateway`'s address from `GATEWAY_ORIGIN`, or — read from `../gateway/.env`
when it exists — `api`'s address or the API key.

Routes: `/sections` (the section manager — artboard 01), `/sections/:type`
(one editor for every
section type the registry declares), `/onboarding/slug` (the claim screen —
artboard E1), `/sign-in`, and `/dev/fields` (the field-states matrix).
Every route but `/sign-in` and `/dev/fields` is gated on `GET /admin/me`
: no portfolio sends the tenant to `/onboarding/slug`, and a
portfolio sends them away from it. A `401` is refreshed once and retried once
by `src/api/client.ts`; a refresh that answers `401`, or a retry that does,
lands on `/sign-in`, with no `returnTo`, and any other
failure is reported with a retry, without signing out.
Sidebar navigation and the preview are still out of scope.

## Layout

| Path | What it is |
|---|---|
| `src/tokens/tokens.css` | The **only** file that may hold a literal colour |
| `src/ui/field-chrome.ts` | The one focus ring and the one invalid treatment |
| `src/ui/primitives.tsx` | Label, Hint, ErrorMessage, GapNote, Pill, Tag, Button, Card, FieldGrid |
| `src/fields/` | The eleven field components, all through `FieldShell` |
| `src/routes/field-specs.tsx` | The matrix as data — eleven components x seven states |
| `src/api/dto.ts` | Hand-written wire types, in one file, ready to be regenerated |
| `src/api/errors.ts` | The admin error model as one closed set |
| `src/api/client.ts` | The one API client, with refresh-and-retry on a `401` |
| `src/auth/` | The sign-in navigation and the sign-out controls |
| `src/registry/` | The only place the section registry is reached |
| `src/renderer/` | Descriptor to form: the kind→component table, gaps, item labels |
| `src/save/` | The save machine and its indicator |
| `src/api/precondition.ts` | Optimistic concurrency: `If-Match` on draft writes |
| `dev/` | The bundle guard's test — never imported from `src/` |
| `src/test/auth-server.ts` | MSW handlers for the auth routes, for Vitest only — there is no mock mode |
| `admin-host/` | The admin host's `/api/*` proxy rule and its test against a stub upstream. The dev server applies it |
| `e2e/` | Playwright, against the dev topology of `../gateway/README.md`; skipped without `E2E_GOOGLE_EMAIL` and `E2E_GOOGLE_PASSWORD` |
| `scripts/check-bundle.mjs` | Fails the build if a dev-only value reached the output |
| `../gateway/` | The `gateway` service and the dev topology |

The `gap` prop is the publish-readiness marker, orthogonal to the five visual
states: `'pending'` is the dotted grey publish-only marker shown while
editing, and it becomes `'blocking'` — which renders as the one invalid
treatment — only after a publish attempt.
