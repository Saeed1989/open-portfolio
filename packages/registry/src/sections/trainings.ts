import type { CollectionSectionDescriptor } from '../types';
import { collectionIsEmpty, hasText, isRecord } from '../empty';

/*
 * Field for field identical to `achievements`, in the same order, minus the
 * Credly fields and the per-item `published` flag: nothing here is imported.
 * `type` keeps the achievements enum unchanged, although it fits a course poorly.
 */
export const trainings = {
  type: 'trainings',
  label: 'Training',
  /* The description and the title hint are advice only: nothing validates them. */
  description:
    'Courses, workshops, bootcamps and structured programmes. Recent and role-relevant learning only — an entry earns its place by supporting the role you are aiming at, not by having been completed.',
  priority: 'could',
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
  emptyCondition: (content) =>
    collectionIsEmpty(
      content,
      (item) => isRecord(item) && hasText(item.title),
    ),
} as const satisfies CollectionSectionDescriptor;
