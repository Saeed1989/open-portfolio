import type { AdminSection } from '../api/dto';

/*
 * A draft that survives a PATCH, so the mock can honour D3.
 *
 * M0's handlers answered from a frozen fixture, which is enough for reads and
 * useless for writes: a version that never moves cannot make `If-Match` fail,
 * and a section whose content never changes cannot show that a save landed.
 * This is the smallest thing that fixes both — one mutable document per
 * tenant, seeded from the fixture, reset on demand.
 *
 * It is a fixture, not a model. Section-type names appear here for the same
 * reason they appear in `data-service/src/seed`: this stands in for rows in a
 * database.
 */

export interface MockDraft {
  version: number;
  sections: AdminSection[];
}

function seed(): MockDraft {
  return {
    version: 4,
    sections: [
      {
        type: 'hero',
        enabled: true,
        order: 0,
        content: {
          name: 'Dana Villalobos',
          title: 'Staff Backend Engineer',
          tagline:
            'Billing correctness and data pipelines — systems where the right answer is checkable.',
          bio: 'Eight years on the parts of a system that have to be right: billing, reconciliation, and the pipelines that feed them.',
          avatar: null,
          /* A CTA type with no target: the conditional-required rule of
             FR-SEC-HERO-2 has something real to fire on, which is the gap the
             mock's hero artboard draws. */
          ctaType: 'resume',
          ctaLabel: 'Download résumé',
          ctaTarget: '',
        },
      },
      {
        type: 'contact',
        enabled: true,
        order: 3,
        /* Model A: values keep their own type, and visibility sits beside
           them. `x` is hidden and keeps its value (FR-SEC-CON-2); the other
           four have no entry, which reads as visible. */
        content: {
          email: 'dana@villalobos.dev',
          github: 'github.com/dvilla',
          linkedin: 'linkedin.com/in/danavillalobos',
          x: 'x.com/dvilla',
          site: 'danavilla.dev',
          visibility: { x: false },
        },
      },
      {
        type: 'education',
        enabled: true,
        order: 5,
        content: {
          items: [
            {
              degree: 'BSc Computer Science',
              institution: 'University of Leeds',
              graduated: '2016-07',
              gpa: '3.8',
              coursework: ['Distributed Systems', 'Compilers'],
              /* Hidden, and the value is kept — FR-SEC-EDU-1's four fields
                 are hideable per entry, so the map belongs to the entry. */
              visibility: { gpa: false },
            },
          ],
        },
      },
      {
        type: 'achievements',
        enabled: true,
        order: 10,
        content: {
          items: [
            { title: 'AWS Solutions Architect', issuer: 'Amazon', type: 'certification' },
            /* Arrived from a Credly import, not yet promoted (FR-SEC-ACH-5).
               Its `title` is empty, and `title` is the descriptor's one
               required field — so promoting it is what turns a gap on, which
               is how a test proves the exclusion was real. */
            { title: '', issuer: 'CNCF', type: 'certification', published: false },
          ],
        },
      },
    ],
  };
}

/*
 * Persisted across reloads, because a server would be.
 *
 * The store was in-memory to begin with, which made a page reload silently
 * reseed it — so "the edit survived a reload" was untestable and, worse, a
 * developer's work vanished on refresh in mock mode. sessionStorage rather
 * than localStorage: a fixture should not outlive the tab that created it.
 */
const STORAGE_KEY = 'openfolio.mock-drafts';

const drafts = new Map<string, MockDraft>(restore());

function restore(): Array<[string, MockDraft]> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Array<[string, MockDraft]>) : [];
  } catch {
    /* Private mode, disabled storage, or a shape from an older build. A
       fixture that cannot be restored is reseeded, never fatal. */
    return [];
  }
}

function persist(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...drafts]));
  } catch {
    /* The store still works in memory for this page. */
  }
}

export function draftFor(tenant: string): MockDraft {
  let draft = drafts.get(tenant);
  if (!draft) {
    draft = seed();
    drafts.set(tenant, draft);
    persist();
  }
  return draft;
}

/** Applies a section PATCH and bumps the document version (SRS §5.2). */
export function writeSection(
  tenant: string,
  type: string,
  patch: { content?: unknown; enabled?: boolean; order?: number },
): MockDraft {
  const draft = draftFor(tenant);
  const index = draft.sections.findIndex((section) => section.type === type);

  const existing =
    index >= 0
      ? draft.sections[index]
      : ({ type, enabled: true, order: draft.sections.length, content: {} } as AdminSection);

  const next: AdminSection = {
    type: existing?.type ?? type,
    enabled: patch.enabled ?? existing?.enabled ?? true,
    order: patch.order ?? existing?.order ?? 0,
    content: patch.content ?? existing?.content ?? {},
  };

  if (index >= 0) draft.sections[index] = next;
  else draft.sections.push(next);

  /* Every write to the document increments `version`, which is what makes it
     usable as a precondition. */
  draft.version += 1;
  persist();
  return draft;
}

/**
 * Moves the document on without the client knowing — a second tab, or the
 * sync worker's fold (FR-INT-15). This is how the mock produces a genuine
 * stale write rather than a canned 409.
 */
export function bumpElsewhere(tenant: string): MockDraft {
  const draft = draftFor(tenant);
  draft.version += 1;
  persist();
  return draft;
}

export function resetDrafts(): void {
  drafts.clear();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Nothing to clear. */
  }
}
