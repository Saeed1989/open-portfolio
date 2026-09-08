# Portfolio Generator — `portfolio` app

Server-rendered public portfolio for a multi-tenant generator. Every tenant is
served from `{slug}.site.com` using **one layout**, themed per tenant at runtime.

---

## Loading the spec

The authoritative requirements live one directory up, outside this repo:

```
../spec/srs.md                    Software Requirements Specification
../spec/BusinessRequirements.md   Source business requirements
../spec/uiDesign/portfolio.html   Approved visual design — extract from, never copy
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
# whole spec — use when starting a stage or changing architecture
sed -n '1,240p' ../spec/srs.md

# section registry only — the architectural spine, §4 and §4.1
awk '/^## 4\. The section registry/,/^## 5\. Data model/' ../spec/srs.md

# a single requirement group, e.g. skills
awk '/^#### 6\.4\.3 Skills/,/^#### 6\.4\.4/' ../spec/srs.md

# look up one requirement id
grep -n 'FR-CFG-2\|FR-REG-3' ../spec/srs.md
```

Rules for using it:

- Read the spec before implementing a section — do not work from memory of it.
- Cite the requirement id in the commit message for anything it constrains.
- The spec is **read-only**. If code and spec disagree, raise it, do not
  silently diverge.
- §10.3 lists open questions. If a task depends on one, stop and ask.


## Directory layout

```
app/
  layout.tsx              root layout, injects theme custom properties
  page.tsx                the portfolio page (server component)
  not-found.tsx           branded 404, noindex
  styleguide/             dev-only: every primitive, every variant, both themes
  preview/                dev-only: SectionRenderer against fixtures
  api/internal/revalidate/route.ts
middleware.ts             Host → slug, reserved-label rejection
components/
  ui/                     component library — primitives only
  sections/
    registry.ts           Record<SectionType, ComponentType>
    SectionRenderer.tsx   filter + order + dispatch
    <Type>/index.tsx      one directory per section type
lib/
  api.ts                  public API client
  theme.ts                token names, theme constants
packages/
  registry/               framework-free descriptors, shared with api + admin
```

---

## Component library rules

`components/ui/` holds primitives: `Text`, `Heading`, `Link`, `Button`, `Tag`,
`TagList`, `Avatar`, `Image`, `Card`, `Icon`, `Divider`, `Badge`, `ProgressBar`,
`SectionShell`.

- Primitives use **only** Tailwind classes bound to token variables. No literal
  hex, no arbitrary `px`, no one-off colour.
- A primitive never imports another app module, never fetches, and knows nothing
  about portfolio data.
- Section components compose primitives. No raw `<div>` for anything a primitive
  covers; no ad-hoc Tailwind for colour or typography.
- Need something the library lacks? Add it to `components/ui/`, register it in
  `/styleguide`, **then** use it — and say so in the response.

Tokens: `--accent`, `--bg`, `--surface`, `--border`, `--text`, `--text-muted`,
`--space-*`, `--radius-*`, `--font-sans`, `--font-display`. Defined once in
`app/globals.css` with a `[data-theme="dark"]` override. `tailwind.config.ts`
references the variables; it does not restate their values.

## Commands

```bash
pnpm dev            # localhost:3000
pnpm build          # must pass before any stage is considered done
pnpm typecheck
pnpm lint
pnpm test
```

Local multi-tenant testing: map `alice.localhost:3000` — most browsers resolve
`*.localhost` without hosts-file edits.

---

## Working style

- Ask before adding a dependency.
- Do not scaffold beyond what was asked; no speculative abstractions.
- If a task conflicts with an invariant above, stop and explain rather than
  finding a workaround.
- Run `pnpm build` before reporting a stage complete.