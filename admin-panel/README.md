# admin

The admin panel. M0 — base app, tokens, field system.

A pure client-rendered React SPA (D0): Vite + React + TypeScript strict +
Tailwind v4, built to static files. It has no server of its own, holds no
session, parses no cookie, and makes no server-side call to `api`. Every call
goes to `/api/admin/*` or `/api/auth/*` on its own origin, where `edge` takes
over.

## Running it

```bash
npm install
npm run dev          # http://localhost:5174 — no API, no mocks
npm run build        # static files in dist/ — no mock worker in this bundle
npm run build:mock   # same, plus the MSW worker (VITE_MOCKS=on)
npm run typecheck && npm run lint && npm test
```

`/dev/fields` is the only route. Everything else redirects to it, because the
shell, the section editors, the preview and the publish flow are all out of
this milestone.

Through `edge`, which is what every environment actually does:

```bash
npm run build:mock                       # or `npm run build` for a live api
cd ../edge && docker compose up          # http://admin.openfolio.test:8080
```

Hosts entries the dev topology expects
(`C:\Windows\System32\drivers\etc\hosts`):

```
127.0.0.1  openfolio.test admin.openfolio.test alice.openfolio.test
```

## Layout

| Path | What it is |
|---|---|
| `src/tokens/tokens.css` | The **only** file that may hold a literal colour |
| `src/ui/field-chrome.ts` | The one focus ring and the one invalid treatment |
| `src/ui/primitives.tsx` | Label, Hint, ErrorMessage, GapNote, Pill, Tag, Button, Card, FieldGrid |
| `src/fields/` | The eleven field components, all through `FieldShell` |
| `src/routes/field-specs.tsx` | The matrix as data — eleven components x seven states |
| `src/api/dto.ts` | Hand-written wire types, in one file, ready to be regenerated |
| `src/api/errors.ts` | The §7.2 error model as one closed set |
| `src/mocks/` | MSW over the four seed tenants, with runtime-switchable faults |
| `../edge/` | The nginx configuration FR-EDGE-6 requires, and the dev topology |

The `gap` prop is the publish-readiness marker, orthogonal to the five visual
states: `'pending'` is the dotted grey publish-only marker shown while
editing, and it becomes `'blocking'` — which renders as the one invalid
treatment — only after a publish attempt.

---

# Report

Required by the milestone. **`spec/srs.md` is not edited by any of this.**

## 1. Requirements this implementation contradicts

### D0 vs SRS §2.1, §2.6 and `spec/architecture.md` — `admin` is not Next.js

§2.1's deployables table, §2.6's flow, and `architecture.md` all name `admin`
as **Next.js**. D0 makes it a client-rendered Vite SPA built to static files.

Everything §2.1 actually *requires* of `admin` survives the swap unchanged —
it "holds no session of its own", the browser's cookie is scoped `Path=/api`
so "the admin app's own server never sees it" (§2.6 step 1), and
`architecture.md` already states "`admin` has no server-side calls to `api`".
An SPA satisfies all three more strictly than a Next.js server does, because
there is no server to hold anything. What breaks is the technology row and one
clause of FR-EDGE-2, diffed in §3 below.

One consequence worth recording: FR-PUB-4 requires server-side rendering for
crawlers, but scopes it to *public pages*. `admin` is behind a session and is
never crawled, so D0 does not touch it. This is the same open question §10.3
Q10 raises for `www`, and D0 answers it the same way for `admin` — client
rendering, accepted.

### `GET /admin/slug-availability` is specified but not implemented

§7.2 specifies it and describes its four answers in detail. It is absent from
`data-service` and from the generated `openapi/admin.json`. The DTO and an MSW
handler for it exist here, so the onboarding screen has something to build
against, but the first real call will 404. M0 builds no onboarding, so nothing
is blocked yet.

### `packages/registry` exports three entrypoints, not four

§2.1 specifies four — descriptors, validation, the sanitiser configuration,
and the render-tree builder of FR-REG-9. The package exports `.`,
`./validation` and `./sanitize`; the builder is not there. It does not block
M0 (the builder is for the live preview, FR-CFG-5, which is explicitly out of
scope), but FR-CFG-5 cannot be built until it exists.

### `api`'s admin surface takes an API key the SRS does not mention

`data-service/src/admin/guards/api-key.guard.ts` requires **`X-Api-Key` as
well as `X-User-Id`**. §2.6 and FR-AUTH-12 describe the identity header alone,
and FR-AUTH-12 says in terms that "no signed token, key pair, or shared secret
takes part". The guard's own comment argues the key proves the caller is
`edge` — a reasonable defence-in-depth answer to §2.6's admitted network
assumption, but it is not what the SRS says, and D8's brief for the dev edge
config mentions only `X-User-Id`. `edge/templates/edge.conf.template` sets
both, or every `/admin/*` request 401s. Either the SRS gains the key or the
guard loses it; right now they disagree.

### The error envelope this client parses does not exist yet

`src/api/errors.ts` parses the shape §7.2 implies — a code plus field-level
errors, every failure at once per FR-PUB-6. `api`'s global filter
(`common/filters/all-exceptions.filter.ts`) is still an empty subclass of
Nest's default, with a comment saying FR-API-4's shape "is built here once
validation exists". The parser therefore reads the specified envelope first
and falls back to Nest's `{ statusCode, message, error }`, so this client works
against `api` as it stands. Field-level errors will be empty until that filter
is written.

## 2. Field states the mock draws that this component set cannot express

**The mock's field-states reference is not in the repository.** The brief
cites `docs/design/admin-panel.html`; the file is `spec/uiDesign/admin-panel.html`,
and it is the *section editors* mock. Its intro links the field system out to a
separate file, **`Field System.dc.html`**, which is not in `spec/uiDesign/` or
anywhere else in the repo. So the matrix at `/dev/fields` is derived from the
CSS primitives that `admin-panel.html` does carry (`.inp` with `.foc`/`.err`/
`.dis`/`.ph`, `.emsg`, `.hint`, `.lbl`, `.btn`, `.pl`, `.tag`, `.sw`, `.rtbar`,
`.f2`/`.f3`) plus its field-coverage list — not reproduced from the reference,
because there is nothing to reproduce it from. Everything below is what that
gap surfaced.

1. **The mock draws the pending marker two different ways.** On the hero
   artboard, a publish-only gap is `.inp.dis` — dashed, grey, with a grey hint
   ("Required to publish because the type is Résumé download. Not blocking
   this save."). On the project case-study artboard, a field the copy
   describes identically — "Empty — marked, not blocking this save" — is drawn
   as `.inp.ta.err` with a full red `.emsg`. One `gap` prop with one rendering
   cannot produce both. **Resolved as dashed grey**, per the mock's own stated
   rule: "Required-but-empty is a grey dotted marker during editing; it only
   turns red after a publish attempt." The red case-study artboard is treated
   as the post-publish state drawn out of sequence.

2. **`gap: 'blocking'` and `error` are one treatment, not two.** The brief
   asks for one invalid treatment for the whole system, and a field that
   blocks publish and a field that failed validation are the same thing to the
   tenant. They are rendered identically and are indistinguishable at
   `/dev/fields` by design — visible in the `error` and `gap 'blocking'`
   columns being the same.

3. **A selected card in an invalid `EnumCards` keeps its accent, not the red
   border.** The invalid state is carried by `aria-invalid` on the radiogroup
   and by the message, and by the *unselected* cards. Drawing the selection red
   would mean the tenant's actual choice reads as the error.

4. **`Switch` has no box, so it has no fill or border to invalidate.** Its
   invalid state is `aria-invalid` plus the message only. The mock has no
   invalid switch to compare against.

5. **`MediaPicker` has two error slots, not one** — the picker's own, and the
   alt text's. FR-MED-5 makes alt text a condition of attaching the image at
   all, so it is a sub-field rather than a sibling, and it needs to be able to
   fail on its own.

6. **No component expresses a "saving" or "saved" state.** The mock's editors
   show save status in the pane chrome, not in the field. Nothing here draws
   it, and nothing in M0 needs it.

### Two deliberate deviations from the mock's drawn values

**`--ink3` was moved in both themes, for contrast.** The mock's light
`#7E8693` renders muted text at **3.67:1 on white and 3.40:1 on `--bg`**,
against the 4.5:1 WCAG AA requires at the 10–11.5px sizes this token is used
at; the dark `#79818E` clears AA on three surfaces but reaches only **4.26:1 on
`--surface2`**. NFR-A11Y-5 holds the admin panel to WCAG AA, the stopping
condition requires axe to report no violations, and `spec/srs.md` outranks the
mock — so the token moved rather than the requirement. The values are
`#676D78` (light) and `#868F9D` (dark): the smallest hue-preserving moves that
clear 4.5:1 against **all nine** backgrounds the token can land on, including
the five soft fills, since a muted label inside a field keeps its colour when
that field turns invalid. Worst cases are 4.53:1 and 4.53:1. Every other token
pair in the mock passes AA unchanged — `ink3` was the only defective one.

**Icon-only controls get a 44x44 target the mock does not draw.** The mock's
`.xbtn` is 28x28 and its tag remove is a bare glyph. The brief requires 44x44,
so `HIT_AREA` grows the target with a centred pseudo-element: the control
occupies exactly the space the mock draws it in, and the target is out of flow.
Padding was the first attempt and was wrong — it inflated each chip until a tag
list stopped flowing inline.

## 3. What `edge` needs in order to serve a static SPA

**First: there was no `edge` configuration in the monorepo at all.** FR-EDGE-6
requires it versioned there and NFR-OPS-5 makes a change to it a change to the
system, but no nginx config, no `edge/` directory and no compose file beyond
`data-service`'s mongo existed. `edge/templates/edge.conf.template` and
`edge/docker-compose.yml` are new in this milestone, written to FR-EDGE-1..6.

Only one clause of FR-EDGE-2 actually changes. As a concrete diff:

```diff
 | FR-EDGE-2 | Must | On the admin host, `edge` routes `/api/auth/*` to
 `api`'s `/auth/*` without an identity subrequest; `/api/admin/*` to `api`'s
 `/admin/*` with the subrequest of FR-EDGE-3; and every other path to the
-`admin` Next.js app. No other path on `api` is reachable from any public
+`admin` app's built static files, served by `edge` from a directory supplied
+by environment variable, with any path that matches no file falling back to
+`index.html` so that a deep link reaches the client router rather than a 404.
+`edge` is the only server `admin` has. No other path on `api` is reachable
-host: `/public/*` is not routable from the admin host, and neither `/admin/*`
+from any public host: `/public/*` is not routable from the admin host, and
-nor `/auth/*` is routable from the wildcard host. |
+neither `/admin/*` nor `/auth/*` is routable from the wildcard host. |
```

In the configuration that is these lines:

```nginx
location / {
    root ${ADMIN_ROOT};
    try_files $uri $uri/ /index.html;
}
```

Three consequences the SRS does not currently record:

- **The fallback must not outrank the two proxied prefixes.** nginx's prefix
  matching handles this — `/api/admin/` and `/api/auth/` are longer prefixes
  than `/` — but it is now load-bearing. A misordered rule would serve
  `index.html` for an API call and the failure would look like a JSON parse
  error in the browser.
- **`index.html` must not be cached, and the hashed assets should be cached
  forever.** With a server app this is the framework's business; with static
  files behind a fallback it is `edge`'s, and a cached `index.html` makes a
  deploy invisible.
- **The fallback answers 200 for every unknown path on the admin host.** The
  SRS's "no other path on `api` is reachable" still holds — nothing reaches
  `api` — but `/public/foo` on the admin host now returns the SPA rather than a
  404. That is a routing fact worth stating rather than discovering.

`edge/templates/edge.conf.template` also implements, and is the first thing in
the repo to implement: FR-EDGE-1's exact-host matching with `return 444` for an
unmatched `Host`; FR-EDGE-3's `auth_request`; FR-EDGE-4's unconditional
`X-User-Id` on **every** proxied location including the unauthenticated ones;
FR-AUTH-16's rate limit; and NFR-OPS-4's request id. FR-EDGE-5 is met in dev by
giving `api` no published port.

**What the edge config does not yet do:** terminate TLS. FR-TEN-1's wildcard
certificate and NFR-OPS-6's locally-trusted equivalent are not set up — the
template listens on port 80 only. NFR-OPS-6 also asks for real hostnames under
a subdomain delegated to loopback rather than `localhost`, because browsers
refuse `Domain=` cookies on single-label domains; the compose file uses
`openfolio.test` with hosts entries, which satisfies that, but the cookie
behaviour it exists to exercise cannot be tested until real auth replaces the
D8 stub anyway.

## 4. Stopping conditions

| Condition | Status |
|---|---|
| `/dev/fields` renders every component in every state, light and dark | **Met.** 11 components x 7 states x 2 themes, verified in Chrome and asserted in `DevFields.a11y.test.tsx` |
| matching the mock | **Cannot be assessed.** The field-states reference `Field System.dc.html` is not in the repo — see §2 |
| axe reports no violations on `/dev/fields` | **Met.** 0 violations in Chrome across axe's default ruleset (41 rules, 891 colour-contrast nodes passing), and 0 on the WCAG 2.2 `target-size` rule. The suite also runs in CI under jsdom, where `color-contrast` is disabled because jsdom has no layout engine |
| `GET /admin/me` resolves through `edge` against MSW | **Not verified.** Docker is not installed on this machine, so `edge` was never started. Verified instead against MSW behind `vite preview`: all four seed tenants plus the no-portfolio branch, and every fault mode of §7.2 |
| `GET /admin/me` resolves through `edge` against a locally running `api` | **Not verified.** Needs Docker (or nginx) *and* MongoDB, neither of which is installed here |
| no hex or rgba outside the token file | **One deliberate exception.** `TENANT_ACCENT` in `src/mocks/handlers.ts` — a tenant's accent colour (FR-THM-1) is content this app transports and never styles itself with, so it belongs in the fixture standing in for the database |
| no section-type name anywhere in `apps/admin` | **Not met literally, and cannot be.** No *component* is named or shaped for a section type, which is what the DO-NOT-BUILD list actually forbids. The names survive in three places, all data or citation: the `SectionType` union in `src/api/dto.ts`, transcribed from the API's own enum — typing it as `string` would weaken the transport types item 5 asks for; the draft fixture and publish-error paths in `src/mocks/handlers.ts`; and comments citing `FR-SEC-*` requirements |

### To run the two unverified checks

```bash
# Terminal 1 — the API and its database
cd data-service && docker compose up -d && npm run seed && npm run start:dev

# Terminal 2 — admin, built the way edge serves it
cd admin-panel && npm run build          # or build:mock for the MSW path
cd ../edge && docker compose up

# Then
curl -i http://admin.openfolio.test:8080/api/admin/me
```

Against `api` this exercises the whole chain: `edge` matches the host, issues
the `auth_request` to the D8 stub, receives 204 with `X-User-Id`, overwrites
any inbound value, adds `X-Api-Key`, and proxies to `api`'s `/admin/me`, which
resolves alice's portfolio. Point `AUTH_UPSTREAM` at `api` and delete the
`auth-stub` service when real auth lands — `edge`'s own configuration does not
change, which is the reason the stub is a service rather than a branch inside
it.
