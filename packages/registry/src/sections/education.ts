import type { CollectionSectionDescriptor } from '../types';
import { collectionIsEmpty, hasText, isRecord } from '../empty';

export const education = {
  type: 'education',
  label: 'Education',
  description: 'Qualifications, with optional detail.',
  priority: 'should',
  businessRef: 'BR 6',
  cardinality: 'collection',
  itemFields: [
    {
      key: 'degree',
      label: 'Degree',
      kind: 'text',
      required: true,
      group: 'headline',
    },
    {
      key: 'institution',
      label: 'Institution',
      kind: 'text',
      required: true,
      group: 'headline',
    },
    { key: 'graduated', label: 'Graduated', kind: 'date', group: 'dates' },
    { key: 'gpa', label: 'GPA', kind: 'text', group: 'detail' },
    { key: 'coursework', label: 'Coursework', kind: 'tags', group: 'detail' },
    {
      key: 'scholarships',
      label: 'Scholarships',
      kind: 'list',
      group: 'detail',
    },
    { key: 'honours', label: 'Honours', kind: 'list', group: 'detail' },
  ],
  emptyCondition: (content) =>
    collectionIsEmpty(
      content,
      (item) =>
        isRecord(item) && (hasText(item.degree) || hasText(item.institution)),
    ),
} as const satisfies CollectionSectionDescriptor;
