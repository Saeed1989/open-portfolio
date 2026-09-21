# admin

The admin panel. M0 — base app, tokens, field system. M1 — registry-driven
form renderer.

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

Routes: `/sections` (a link list), `/sections/:type` (one editor for every
section type the registry declares), and `/dev/fields` (M0's field-states
matrix). The section manager, sidebar navigation beyond that link list, section
reordering, the preview, publish and onboarding are all out of these
milestones.

Playwright drives the built mock bundle:

```bash
npm run test:e2e
```

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
| `src/registry/` | The only place the section registry is reached (M1) |
| `src/renderer/` | Descriptor to form: the kind→component table, gaps, item labels (M1) |
| `src/save/` | D2's save machine and the artboard-39 indicator (M1) |
| `src/api/precondition.ts` | D3, whole (M1) |
| `e2e/` | Playwright: autosave, 5xx retry, 409 (M1) |
| `../edge/` | The nginx configuration FR-EDGE-6 requires, and the dev topology |

The `gap` prop is the publish-readiness marker, orthogonal to the five visual
states: `'pending'` is the dotted grey publish-only marker shown while
editing, and it becomes `'blocking'` — which renders as the one invalid
treatment — only after a publish attempt.

---

# Report — M0

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

---

# Report — M1

Required by the milestone. **`spec/srs.md` is not edited by any of this.**

## 1. D2, D3 and D4 as proposed spec deltas

All three are provisional and appear nowhere in `spec/srs.md`. Each is
implemented in exactly one module, so changing one does not touch the renderer:
`src/save/machine.ts`, `src/api/precondition.ts`, and
`src/registry/shim/validate.ts` respectively.

### D2 — autosave. Proposed as `FR-CFG-8`

> **FR-CFG-8 (Should)** — Admin saves the draft automatically. An edit to a
> section schedules one `PATCH /admin/portfolio/sections/:type` 800 ms after
> the last change; a further edit within that window replaces the pending
> write rather than queueing a second. A save is flushed immediately on
> `Cmd/Ctrl+S` and on leaving the section. There is no discard control: the
> draft *is* the working copy (§2.4) and `required` is not enforced until
> publish (FR-REG-8), so a save has nothing to be confirmed against. The
> tenant is shown one of five states — saving, saved with a timestamp, failed,
> refused, or conflicted (FR-CFG-9) — and the indicator never blocks typing and
> never opens a dialog. A failed save holds the edits in the tab and retries
> with exponential backoff to a 30-second ceiling; a save the server refuses on
> a content rule is not retried, because the only remedy is to change the
> content. Publish is unavailable while a write is in flight, so a publish
> cannot race a save.

Note what "saved" does *not* mean, which artboard 39 is explicit about and a
requirement should be too: shape and type were validated, `required` was not,
so an incomplete draft still reads as saved.

### D3 — optimistic concurrency. Proposed as `FR-CFG-9`, plus an amendment to §7.2

> **FR-CFG-9 (Should)** — Every admin write carries `If-Match` set to the
> `version` of the portfolio document it was composed against (§5.2). The admin
> surface compares it to the stored `version` before writing, and refuses a
> mismatch with `409 stale_write` carrying the current document. Admin neither
> discards the tenant's edits nor overwrites the server's copy on that refusal:
> it reports the conflict, keeps the local edits editable and copyable, and
> takes up the server's version only on an explicit action.

§7.2's endpoint list would gain the header and the response code; `409` there
currently means only `portfolio_exists` and `slug_taken`.

Why the document's `version` rather than a per-section ETag: §5.2 gives the
portfolio one `version`, already incremented by every write including the sync
fold (FR-INT-15). A section PATCH writes the portfolio, so two sections edited
in two tabs are two writes to one document — and the second one should be told
about the first.

### D4 — browser-side publish validation. Proposed as an amendment to FR-PUB-6

> **FR-PUB-6 (amended)** — … reports every failure at once, per field, rather
> than stopping at the first. Each failure is `{ path, code, message }`, where
> `path` addresses the field within the section's content object (`name`,
> `items[2].company`). The registry exports the same validation as a pure
> function over a descriptor and a content object, so admin can evaluate it in
> the browser and produce identical failures without a round trip — one
> function deciding for both, on the model of FR-REG-9.

The `code` is the part the package does not have: its `FieldError` is
`{ path, message }`, which forces a caller to match on prose to branch on a
rule.

## 2. What `packages/registry` is missing, and what the shim stands in for

The package is in better shape than the brief's "if missing" branch assumes —
**it declares all thirteen section types, including `hero` and `contact`**,
with `emptyCondition`, `REGISTRY_VERSION`, a sanitiser allowlist, and Credly
parsing. What it cannot yet express is the M1 feature set. Of the four things
the brief says to check: descriptors **present**, `validateForPublish`
**projects-only**, item label templates **absent**, `hideable` **absent**.

| Missing | Why M1 needs it | Shim stands in with |
|---|---|---|
| A generic `validateForPublish(descriptor, content)` | D4, and the FR-REG-3 proof — a new section type must validate with no code change | `shim/validate.ts`, a generic walk of `required`/`requiredWhen`/`hideable`/`min`/`max` |
| `code` on `FieldError` | D4's `{ path, code, message }` | `ValidationError` in `shim/types.ts` |
| `requiredWhen` on a field descriptor | FR-SEC-HERO-2's CTA target following the CTA type, evaluated generically | `RequiredWhen` — `{ field, present }` or `{ field, oneOf }` |
| `hideable` on a field descriptor | FR-SEC-CON-2's per-link toggle, FR-SEC-EDU-1's four hideable fields | `hideable: true`, whose value is stored as `{ value, visible }` |
| `itemLabel` on a collection descriptor | The mock's rule that no section supplies its own row renderer | `itemLabel` / `itemLabelFallback` / `itemNoun` |
| Date precision on a `date` field | FR-SEC-EXP-1 wants a month, FR-SEC-SPK-1 a full date; one kind cannot say which | **Not shimmed** — every date renders at month precision, noted in `field-map.ts` |
| A way to mark an enum as needing a sentence per option | `EnumCards` exists and no descriptor can ask for it, so every enum renders as a `Select` | **Not shimmed** — noted in `field-map.ts` |
| The FR-REG-9 builder entrypoint | FR-CFG-5's preview (out of M1 scope) | **Not shimmed** — carried over from the M0 report, still absent |

`FieldDescriptor.hidden` already exists in the package and is **not** the same
concern: it means admin draws no input because the value is recorded rather
than asked for. The shim keeps that meaning untouched and adds `hideable`
beside it.

**Two package descriptors are not reused, and this is the part worth arguing
about.** The shim writes `hero` and `contact` from `srs.md` instead, because:

- `hero.ctas` is declared `{ kind: 'list', max: 2 }`. A descriptor-driven
  renderer cannot turn that into FR-SEC-HERO-2's typed choice — and the package
  *already disagrees with itself* here: `content.ts` exports
  `Cta { kind, label, href }` and `HeroContent.ctas`, so the TypeScript side has
  the typed choice while the descriptor has a free-text list. FR-REG-1 makes the
  descriptor the runtime source of truth, so the descriptor is the one that is
  wrong. The `max: 2` also contradicts FR-SEC-HERO-1's singular "primary CTA"
  and the mock's "Primary CTA".
- `contact`'s links carry no `hideable`, so nothing tells a generic renderer to
  draw FR-SEC-CON-2's toggle — even though `ContactLink` in `content.ts` already
  has `visible: boolean`. The same type/descriptor split.
- `contact`'s descriptor declares an `intro` longtext that neither FR-SEC-CON-1
  nor the mock's Contact artboard has.

The shim's types mirror the package's field for field, so the swap is an import
change in `src/registry/index.ts` and nothing else. `IS_SHIMMED` is exported and
rendered as a banner on the editor, so nobody mistakes two hand-written
descriptors for the registry.

### One defect M1 surfaced in this app

`src/api/dto.ts` hard-coded the thirteen section types as a TypeScript union.
That makes adding a section type an edit to `admin`, which FR-REG-3 forbids in
terms. It is now `SectionType = string`: the registry owns the vocabulary, and
this app never validates a section type — it asks for a descriptor and renders
what comes back, or renders nothing.

## 3. Where the mock and the SRS disagree, for hero and contact

| # | Field | SRS | Mock | Shipped | Why |
|---|---|---|---|---|---|
| 1 | `hero.bio` | FR-SEC-HERO-1 lists it, marks only name and title required | Editor label draws **`Bio *`** — but the mock's own registry panel beside it shows `bio textarea` with no `*publish`, and its field-coverage list shows `bio` unmarked | **Not required** | The mock contradicts *itself*; the SRS breaks the tie |
| 2 | `hero` CTA | FR-SEC-HERO-2 gives it a type, a label and a target; FR-SEC-HERO-1 marks neither required | `ctaType*`, `ctaLabel*`, `ctaTarget*` (conditional on type) | CTA optional as a whole; **label and target required once a type is chosen** | Satisfies both — nothing is forced, and a half-filled CTA is still invalid. This is the conditional-required case the milestone asks for |
| 3 | `hero.emptyCondition` | FR-SEC-HERO-1 makes name and title the required pair | Registry panel: `!name && !title` | **The mock's** | The package instead requires all six fields blank, so a hero holding only a bio would render with no heading |
| 4 | `hero.bio` length | "soft character guidance shown", no number | "Soft guidance, 600 characters" | **600** | The package says 400; the SRS gives no number, so the mock decides |
| 5 | `hero` field count | — | Prose says "nine fields"; its own registry panel and readiness rail both say eight | **Eight** | The prose is off by one |
| 6 | `contact.email` | FR-SEC-CON-1 marks nothing required | **`Email *`** | **Not required** | SRS wins. FR-SEC-CON-3 governs only how a published address is rendered, not whether one exists |
| 7 | `contact.intro` | Not in FR-SEC-CON-1 | Not in the artboard | **Omitted** | Only the package has it |
| 8 | `contact` layout | — | A four-column table: Channel / Value / **Link health** / Show on page | **Generic label + control + switch** | "No editor other than the generic page" is a DO-NOT-BUILD item; the table is per-section tuning |
| 9 | `contact` link health | FR-SEC-PROJ-9 scopes weekly link checking to **project** links | Draws a link-health column on contact links | **Not built** | The mock extends FR-SEC-PROJ-9 beyond its stated scope — flagged rather than implemented |
| 10 | Save model | Silent: §2.4 defines draft/publish and nothing about saving | Top bar says "All changes saved" **and** the footer has "Discard changes" + "Save draft" | **Autosave, no discard** (D2) | The mock is internally inconsistent; D2 resolves it |

Items 1, 3 and 10 are cases where the mock disagrees with *itself* rather than
with the SRS, which is worth separating from the rest.

## 4. Stopping conditions

| Condition | Status |
|---|---|
| `/sections/hero` and `/sections/contact` fully editable and autosaving | **Met.** Verified in Chrome: hero shows conditional required firing (`CTA label *` appears once a type is chosen; the rail reads "Blocking publish 1 — CTA target is required to publish, because another field is set to 'resume'"); contact shows five hideable links; an edit goes `No changes yet → Unsaved changes → Saved 10:17 PM` and the server holds the value |
| …through `edge` against MSW | **Not verified through `edge`.** Docker and nginx are still absent on this machine (unchanged from M0). Verified against MSW behind `vite preview`, which serves the same built bundle `edge` serves from disk |
| No `hero`/`contact` outside `src/registry/`, except tests and fixtures | **Met.** The only two remaining hits were the `SectionType` union in `src/api/dto.ts`, now `string` — see §2 |
| The fake-descriptor test passes | **Met.** `src/renderer/fake-descriptor.test.tsx` invents two section types that exist nowhere else and asserts they render every kind, get a visibility switch, validate, produce readiness counts, bind gaps, label collapsed rows, and enforce min/max — with no change outside that file |
| Every save state reachable through the MSW toggles | **Met.** `idle`, `saving`, `saved`, `failed`, `refused`, `stale` all reached in the browser via `save_server_error`, `save_refused`, `save_stale` |

**Tests:** 67 Vitest across 7 files, 6 Playwright. Typecheck and lint clean.

Also verified by hand in the browser, since these are the claims a unit test
can assert without being true of the running app: `If-Match` moved the document
5 → 6 on a fresh write, and replaying version 5 returned `409 stale_write`
carrying the current document at version 6; hiding a contact link persisted
`{ value: "danavilla.dev", visible: false }`, keeping the value rather than
clearing it.

One verification artefact worth recording. Driving the MSW faults from the
console *after* issuing raw `fetch` writes produced `stale` where `refused` was
expected. That is correct behaviour on both sides — the handler checks
`If-Match` before the content rule, so a stale write is reported as stale even
when its payload would also have been refused, and the raw writes had desynced
the client's version. Re-running after a reload gives `refused`.
