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
        content: {
          email: { value: 'dana@villalobos.dev', visible: true },
          github: { value: 'github.com/dvilla', visible: true },
          linkedin: { value: 'linkedin.com/in/danavillalobos', visible: true },
          x: { value: 'x.com/dvilla', visible: false },
          site: { value: 'danavilla.dev', visible: true },
        },
      },
    ],
  };
}

const drafts = new Map<string, MockDraft>();

export function draftFor(tenant: string): MockDraft {
  let draft = drafts.get(tenant);
  if (!draft) {
    draft = seed();
    drafts.set(tenant, draft);
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
  return draft;
}

export function resetDrafts(): void {
  drafts.clear();
}
