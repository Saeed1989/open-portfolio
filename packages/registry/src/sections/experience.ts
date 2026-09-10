import type { CollectionSectionDescriptor } from '../types';
import { collectionIsEmpty, hasText, isRecord } from '../empty';

export const experience = {
  type: 'experience',
  label: 'Experience',
  description: 'Roles, most recent first.',
  priority: 'should',
  businessRef: 'BR 5',
  cardinality: 'collection',
  itemFields: [
    {
      key: 'title',
      label: 'Title',
      kind: 'text',
      required: true,
      group: 'headline',
    },
    {
      key: 'company',
      label: 'Company',
      kind: 'text',
      required: true,
      group: 'headline',
    },
    { key: 'startDate', label: 'From', kind: 'date', group: 'dates' },
    { key: 'endDate', label: 'To', kind: 'date', group: 'dates' },
    { key: 'description', label: 'Summary', kind: 'longtext' },
    {
      key: 'accomplishments',
      label: 'Accomplishments',
      kind: 'list',
      group: 'detail',
    },
  ],
  emptyCondition: (content) =>
    collectionIsEmpty(
      content,
      (item) =>
        isRecord(item) && (hasText(item.title) || hasText(item.company)),
    ),
} as const satisfies CollectionSectionDescriptor;
