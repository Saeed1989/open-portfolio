# Portfolio Generator — `www` app

Marketing landing page at the apex domain, and the entry point into tenant
creation. Static React SPA. Holds no session, fetches nothing, renders no
tenant data.

---

## Loading the spec

The authoritative requirements live one directory up, outside this repo:

```
../spec/srs.md                    Software Requirements Specification
../spec/BusinessRequirements.md   Source business requirements
../spec/uiDesign/landing-page.html     Approved visual design — extract from, never copy
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
# scope and non-goals — read before adding anything to the page
awk '/^### 1\.2 Scope/,/^### 1\.3/' ../spec/srs.md

# what is deferred, and why — the page must not contradict it
awk '/^### 10\.2 Deferred/,/^### 10\.3/' ../spec/srs.md

# sign-in and portfolio creation, the flow this page starts
awk '/^### 6\.1 Authentication/,/^### 6\.2/' ../spec/srs.md

# look up one requirement id
grep -n 'FR-AUTH-1\|FR-TEN-1\|FR-DAT-1' ../spec/srs.md
```

Rules for using it:

- Read the spec before implementing a section — do not work from memory of it.
- Cite the requirement id in the commit message for anything it constrains.
- The spec is **read-only**. If code and spec disagree, raise it, do not
  silently diverge.
- §10.3 lists open questions. If a task depends on one, stop and ask.

---

## Directory layout

```
src/
  main.tsx                 mount, no router until a second route exists
  App.tsx                  section order, and nothing else
  styles/globals.css       @theme tokens, background layers, reset
  components/ui/           primitives only
  sections/                one component per landing section, in page order
  content/copy.ts          every string on the page
  lib/slug.ts              client-side slug format validation
index.html
tailwind.config.ts
```

Copy lives in `content/copy.ts`, never inline in JSX. Section components take no
props beyond what they read from that module.

---

## Component library rules

`components/ui/` holds primitives: `Text`, `Heading`, `Link`, `Button`, `Card`,
`Badge`, `Icon`, `Input`, `SlugInput`, `BrowserFrame`, `SectionShell`.

- Primitives use **only** Tailwind classes bound to token variables. No literal
  hex, no arbitrary `px`, no one-off colour.
- A primitive never imports another app module and never fetches.
- Section components compose primitives. No raw `<div>` for anything a primitive
  covers; no ad-hoc Tailwind for colour or typography.
- Need something the library lacks? Add it to `components/ui/`, register it in
  `/styleguide`, **then** use it — and say so in the response.

Tokens: `--color-bg`, `--color-surface`, `--color-border`, `--color-text`,
`--color-text-muted`, `--color-accent-from`, `--color-accent-to`,
`--shadow-lift-1`, `--shadow-lift-2`, `--shadow-glow`, `--space-*`,
`--radius-*`, `--font-sans`, `--font-mono`. Defined once in `styles/globals.css`
as OKLCH under `@theme`; `tailwind.config.ts` references them and does not
restate their values.

Gradient and light discipline — the design depends on it:

- One light source, top-left. Fills run light→dark on that axis, highlights sit
  on top edges, shadows fall bottom-right. Nothing contradicts this.
- Gradients come from `--color-accent-from/-to` only. Never a third hue.
- Gradient text appears once, on the hero headline. Body copy, labels, and icons
  are solid colour.
- Contrast is measured against the **lightest** point of the gradient behind the
  text, and must pass AA.
- Motion animates `transform` and `opacity` only, and is fully disabled under
  `prefers-reduced-motion: reduce`.

Dependencies: `react`, `react-dom`, `tailwindcss`, Vite. Anything else needs a
stated reason. No UI kit, no animation library, no icon package — icons are
inline SVG. Budget is ~60 KB gzipped JS.

---

## Don'ts

- No password field. OAuth only — GitHub or Google (FR-AUTH-1).
- No custom-domain claim, anywhere. Deferred (§10.2). Every URL example is
  `{slug}.openfolio.site` (FR-TEN-1).
- No pricing or plan comparison. Free tier only (§10.1.5).
- No invented testimonials, named people, or "trusted by" logos.
- No analytics script — the platform injects no tracking (FR-ANL-3).
- No OAuth flow here. The CTA links to the admin host (§2.1).
- No availability API call from the slug input, and no reserved-slug list
  (FR-DAT-1) in client code. No unauthenticated slug lookup exists (§10.3 Q4),
  so the input validates format only and carries the value to the admin host as
  a query param; the taken/reserved states are built and stay unwired.

---

## Commands

```bash
npm run dev -w apps/www         # localhost:5173
npm run build -w apps/www       # must pass before any stage is considered done
npm run typecheck -w apps/www
npm run lint -w apps/www
```

`packages/registry` builds first — npm workspaces resolve no build order.

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