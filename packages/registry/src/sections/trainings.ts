import type { CollectionSectionDescriptor } from '../types';
import { collectionIsEmpty, hasText, isRecord } from '../empty';

/*
 * Trainings (business §11a, FR-SEC-TRN-1) — the FR-REG-3 test case.
 *
 * This entry is the whole of the data-side change. It adds no field kind, no
 * descriptor property, no content shape the api did not already store, and
 * no branch in admin: the section is a collection of items whose fields are
 * the ones `achievements` already declares, so every form widget, validator
 * and persistence path it needs already exists and is already generic.
 *
 * Field for field identical to `achievements`, in the same declared order,
 * minus the three Credly fields. Credly belongs to achievements alone
 * (FR-SEC-ACH-2 … 7): no badge import, no embed-code paste, no
 * `credlyUsername` beside `items`, and no per-item `published` flag — that
 * flag exists in §5.2 because an import cannot judge which badges are
 * high-signal, and nothing here is imported.
 *
 * `type` carries the achievements enum unchanged. Certification / award /
 * ranking / hackathon does not describe a course well; SRS open question 7
 * says so in as many words and lists the alternatives. Option (a) — two
 * types, enum unchanged — is what is specified, so it is what is here.
 */
export const trainings = {
  type: 'trainings',
  label: 'Training',
  /*
   * FR-CFG-6: the source document's guidance, surfaced in admin as advice.
   * Both hints below are editorial judgements (11a.3, 11a.4) — the system
   * cannot tell whether a course is role-relevant, or that the certification
   * listed here is the same one listed under Achievements. Nothing validates
   * them, and nothing blocks a publish over them.
   */
  description:
    'Courses, workshops, bootcamps and structured programmes. Recent and role-relevant learning only — an entry earns its place by supporting the role you are aiming at, not by having been completed.',
  priority: 'could',
  businessRef: 'BR 11a',
  cardinality: 'collection',
  itemFields: [
    {
      key: 'type',
      label: 'Type',
      kind: 'enum',
      options: ['certification', 'award', 'ranking', 'hackathon'],
      group: 'meta',
    },
    { key: 'date', label: 'Completed', kind: 'date', group: 'meta' },
    {
      key: 'title',
      label: 'Title',
      kind: 'text',
      required: true,
      help: 'List a credential once — as an achievement or as a training, never in both sections.',
    },
    { key: 'issuer', label: 'Issuing body', kind: 'text' },
    {
      key: 'url',
      label: 'Certificate or course page',
      kind: 'url',
      group: 'links',
    },
  ],
  /* The same predicate as achievements: an item with no title draws nothing,
     and a collection of nothing but those is an empty section (FR-CFG-2). */
  emptyCondition: (content) =>
    collectionIsEmpty(
      content,
      (item) => isRecord(item) && hasText(item.title),
    ),
} as const satisfies CollectionSectionDescriptor;
