# Portfolio Generator — `api` service

NestJS API for a multi-tenant portfolio generator. One deployable hosting **two
logically separate surfaces**: a public read-only surface and a session-authenticated
admin surface. Owns MongoDB; nothing else touches it.

---

## Loading the spec

The authoritative requirements live one directory up, outside this repo:

```
../spec/srs.md                    Software Requirements Specification
../spec/BusinessRequirements.md   Source business requirements
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
# system overview — surfaces, request flows, draft/publish model
awk '/^## 2\. System overview/,/^## 3\. Actors/' ../spec/srs.md

# section registry — the architectural spine, §4 and §4.1
awk '/^## 4\. The section registry/,/^## 5\. Data model/' ../spec/srs.md

# data model — the seven collections
awk '/^## 5\. Data model/,/^## 6\. Functional requirements/' ../spec/srs.md

# API surfaces — every endpoint this service exposes
awk '/^## 7\. API surfaces/,/^## 8\. Non-functional/' ../spec/srs.md

# a single requirement group, e.g. integrations
awk '/^### 6\.6 Integrations/,/^### 6\.7 Theme/' ../spec/srs.md

# look up one requirement id
grep -n 'FR-REG-8\|FR-API-3' ../spec/srs.md
```

Rules for using it:

- Read the spec before implementing an endpoint or a section type — do not work
  from memory of it.
- Cite the requirement id in the commit message for anything it constrains.
- The spec is **read-only**. If code and spec disagree, raise it, do not
  silently diverge.
- §10.3 lists open questions. If a task depends on one, stop and ask.

---

## Directory layout

```
src/
  main.ts
  app.module.ts               mounts PublicModule, AdminModule, WorkerModule

  public/
    public.module.ts          forFeature([Portfolio]) — and nothing else
    guards/slug.guard.ts
    portfolios/               controller, service, dto/
    sitemap/

  admin/
    admin.module.ts
    guards/session.guard.ts
    portfolio/                controller, service, dto/
    sections/                 controller, service, dto/
    media/                    "
    integrations/             "
    publish/                  "
    link-health/              "

  worker/
    worker.module.ts          forFeature([IntegrationConnection, IntegrationCache, LinkHealth])
    sync/
    link-health/

  schemas/                    plain @Schema definitions — no providers, no module
  external/                   revalidator/, storage-signer/
  common/                     filters/, interceptors/, decorators/tenant.decorator.ts
```

`packages/registry` is a workspace dependency, consumed as prebuilt dual ESM/CJS
output. This service is CommonJS built with `tsc`, not bundled.

---

## Surface separation rules

The public and admin trees are two module trees in one process. They are separate
the way two services would be:

- Separate controllers, separate guards, separate DTOs. **No DTO, service, or guard
  is imported across the boundary** (§2.1).
- Public DTOs are built by **allowlist**, never by stripping fields off an admin DTO
  or a Mongoose document. A field reaches the public response because someone named
  it (FR-API-1).
- Public resolves tenant from the `Host`-derived slug. Admin resolves tenant from the
  session. **No admin endpoint accepts a portfolio id or user id as a parameter** —
  not in the path, not in the body, not as a query (FR-API-3, FR-TEN-4).
- Scope resolution has exactly one implementation. If you find yourself reading
  `req.user.portfolioId` inline, use the decorator instead.
- Public reads `published` only; admin reads and writes `draft` only (§2.4).
- The public read performs **one database read and zero outbound HTTP calls**
  (NFR-PERF-3, FR-INT-1).

## Registry and validation rules

`packages/registry` is the single source of truth for section types and field
schemas. This service validates against it; it does not restate it.

- **Never hard-code a field list** in this service — not in a DTO, not in a schema,
  not temporarily while the registry is incomplete (FR-REG-1).
- `required` is enforced at **publish**, not at save. A draft write validates shape,
  type, and enumeration only, so a half-written section can be saved (FR-REG-8).
- `validateForPublish` additionally enforces `required`, collection `min`/`max`, and
  cross-field rules.
- Validation **reports every failure at once**, per field. Never stop at the first
  (FR-PUB-6).
- Rich text is sanitised at write time against the **one allowlist constant exported
  by the registry**. Do not write a second sanitiser or a second allowlist
  (FR-SEC-PROJ-12).
- A pasted Credly embed code yields a badge identifier and nothing else. The markup
  is never stored and never re-injected (FR-INT-14).

## Stubbed dependencies

Two things this service calls do not exist yet. Both sit behind an interface with a
local implementation now and a real one later. **Only the env var and the
implementation change** — callers stay identical.

```
Revalidator      NoopRevalidator (REVALIDATE_MODE=noop)  →  HttpRevalidator (=http)
                 POST http://<portfolio-host>/internal/revalidate { slug }, shared secret

StorageSigner    LocalStorageSigner (STORAGE_MODE=local) →  S3StorageSigner (=s3)
                 issues short-lived signed upload URLs; the API never proxies bytes
```

## Commands

```bash
pnpm start:dev      # localhost:3001
pnpm build          # must pass before any stage is considered done
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
docker compose up -d    # local MongoDB
```

Cross-tenant isolation has its own suite (NFR-SEC-1): every admin endpoint attempted
with a second tenant's identifiers. A new admin endpoint adds a case to it.

---

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