import type { CollectionSectionDescriptor } from '../types';
import { collectionIsEmpty, hasText, isRecord } from '../empty';

export const testimonials = {
  type: 'testimonials',
  label: 'Testimonials',
  description: 'Two to four, in the words of people you worked with.',
  priority: 'should',
  businessRef: 'BR 8',
  cardinality: 'collection',
  min: 2,
  max: 4,
  itemFields: [
    { key: 'quote', label: 'Quote', kind: 'longtext', required: true },
    { key: 'photo', label: 'Photo', kind: 'image', group: 'attribution' },
    {
      key: 'name',
      label: 'Name',
      kind: 'text',
      required: true,
      group: 'attribution',
    },
    { key: 'role', label: 'Role', kind: 'text', group: 'attribution' },
    { key: 'company', label: 'Company', kind: 'text', group: 'attribution' },
  ],
  emptyCondition: (content) =>
    collectionIsEmpty(
      content,
      (item) => isRecord(item) && hasText(item.quote),
    ),
} as const satisfies CollectionSectionDescriptor;
