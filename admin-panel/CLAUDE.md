# Portfolio Generator — `admin` app

Client-rendered React SPA at `admin.openfolio.site`. A tenant edits their draft,
configures sections and theme, and publishes. Built to static files; `edge`
serves it at `/` on the admin host.

---

## Loading the spec

The authoritative requirements live one directory up, outside this repo:

```
../spec/srs.md                     Software Requirements Specification
../spec/BusinessRequirements.md    Source business requirements
../spec/uiDesign/admin-panel.html  Approved visual design — extract from, never copy
../spec/admin-panel-plan.md        Milestones and open decisions (D0–D10)
```

`../spec` is outside the project root, so it is not readable by default. Add it
once per machine:

```bash
claude --add-dir ../spec
```

Or permanently, in `.claude/settings.json`:

```json
{ "permissions": { "additionalDirectories": ["../spec"] } }
```

Then load context at the start of a session:

```bash
# section registry — the architectural spine, §4 and §4.1
awk '/^## 4\. The section registry/,/^## 5\. Data model/' ../spec/srs.md

# the admin API surface, §7.2
awk '/^### 7\.2 Admin/,/^### 7\.3/' ../spec/srs.md

# how an admin request reaches api, §2.6
awk '/^### 2\.6 /,/^---/' ../spec/srs.md

# a single section's requirements, e.g. projects
awk '/^#### 6\.4\.2 Projects/,/^#### 6\.4\.3/' ../spec/srs.md

# look up one requirement id
grep -n 'FR-REG-8\|FR-API-3' ../spec/srs.md

# the decisions currently in force
awk '/^## 1\. Decisions/,/^## 2\. /' ../spec/admin-panel-plan.md
```

Rules for using it:

- Read the spec before implementing a screen — do not work from memory of it.
- Cite the requirement id in the commit message for anything it constrains.
- The spec is **read-only**. If code and spec disagree, raise it, do not
  silently diverge.
- §10.3 of the SRS lists open questions, and §1 of the plan lists open
  decisions. If a task depends on one, stop and ask.
- Where the design and the SRS disagree, the SRS wins. Report the difference.

## Boundaries

These hold in every milestone. Breaking one is a defect, whatever the task says.

- **Plain client.** No session, no cookie handling, no auth logic, no server of
  its own. Every call goes to `/api/admin/*` or `/api/auth/*` on its own origin.
  (§2.1, §2.6)
- **No identity in requests.** Never send a portfolio id or user id in a path,
  query, or body. Scope comes from `edge`. (FR-API-3, FR-TEN-4)
- **No cross-app imports.** Nothing from `apps/api` or `apps/portfolio`.
  `packages/registry` is imported only by `src/registry/index.ts`.
- **Forms come from descriptors.** No component, route, or branch is named after
  a section type. Section names appear only under `src/registry/`. (FR-REG-1,
  FR-REG-3)
- **Save is not publish.** Draft writes check shape and type only; `required`,
  min, and max bite at publish. A publish-only gap is grey while editing and red
  only after a publish attempt. (FR-REG-8)
- **The builder decides what is public.** Disabled sections, unpublished items,
  and hidden fields are removed by the registry builder, never by hiding them in
  a component. (FR-REG-9)
- **One sanitiser allowlist.** Rich-text marks and paste stripping import the
  registry constant. Never restate it. (FR-SEC-PROJ-12)
- **Dev identity stays out of `src/`.** The dev API key and user id are read by
  `vite.config.ts` only, from env vars without the `VITE_` prefix.

## Directory layout

```
src/
  main.tsx
  routes/                 one file per route
    dev/                  dev-only: fields, every state, both themes
  components/
    ui/                   primitives only
    fields/               the eleven field components
    form/                 descriptor → form renderer, save machine
  registry/
    index.ts              the only import of packages/registry
    shim/                 temporary descriptors until the package ships
  api/
    transport.ts          fetch, error envelope, If-Match
    types.ts              DTO types — regenerated from /docs/admin
  mocks/                  MSW handlers over the four seed tenants
  styles/tokens.css       the only file with a colour value
vite.config.ts            dev proxy and identity injection (direct mode)
dev/tenants.ts            DEV_TENANT → seed user id
```

---

## Component library rules

`components/ui/` holds primitives: `Button`, `Card`, `Pill`, `Tag`, `Label`,
`Hint`, `ErrorMessage`, `Switch`, `Dialog`, `Grid`.

`components/fields/` holds the eleven field components: `TextInput`, `TextArea`,
`Select`, `TagList`, `Switch`, `MediaPicker`, `DateInput`, `RichText`,
`Repeater`, `EnumCards`, `SlugField`.

- Primitives and fields use **only** Tailwind classes bound to token variables.
  No literal hex, no arbitrary `px`, no one-off colour.
- A primitive or field never fetches, never imports the registry, and knows
  nothing about sections or portfolio data.
- Every field supports the same states: default, focus, error, disabled,
  placeholder, and `gap: 'none' | 'pending' | 'blocking'`. One invalid treatment
  and one focus ring for the whole library.
- Every field associates its label, sets `aria-invalid` on error, and references
  hint and error through `aria-describedby`. Icon-only controls are at least
  44×44. (NFR-A11Y-5)
- Dialogs follow the focus contract: focus to Close on open, Tab trapped, Esc
  and Close return focus to the trigger. (FR-SEC-PROJ-13)
- Need something the library lacks? Add it to `components/ui/` or
  `components/fields/`, register it in `/dev/fields`, **then** use it — and say
  so in the response.

Tokens: `--bg`, `--surface`, `--surface-2`, `--field`, `--line`,
`--line-strong`, `--ink`, `--ink-2`, `--ink-3`, `--accent`, `--accent-ink`,
`--accent-soft`, `--accent-line`, `--danger`, `--danger-soft`, `--warn`,
`--warn-soft`, `--ok`, `--ok-soft`, `--tag-bg`, `--tag-ink`, `--scrim`,
`--shadow`, `--font-sans`, `--font-mono`. Defined once in
`src/styles/tokens.css` with a `[data-theme="dark"]` override. The Tailwind
theme references the variables; it does not restate their values.

## Commands

```bash
npm run dev -w apps/admin          # ADMIN_DEV_MODE=mock | direct | edge
npm run build -w apps/admin        # must pass before any milestone is done;
                                   # fails if the dev key string is in the bundle
npm run typecheck -w apps/admin
npm run lint -w apps/admin
npm run test -w apps/admin         # vitest
npm run e2e -w apps/admin          # playwright
```

Dev modes:

- `mock` — MSW over the seed tenants. Default. No api needed.
- `direct` — Vite proxy to `API_URL`, injecting `X-User-Id` and
  `X-Dev-Api-Key`. Pick the tenant with `DEV_TENANT=alice|bob|carol|dave`,
  then restart.
- `edge` — behind the monorepo's nginx `edge`. Run this before merging anything
  that touches requests; `direct` does not exercise `edge`'s routing rules.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.