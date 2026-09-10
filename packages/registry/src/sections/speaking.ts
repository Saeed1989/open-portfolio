import type { CollectionSectionDescriptor } from '../types';
import { collectionIsEmpty, hasText, isRecord } from '../empty';

export const speaking = {
  type: 'speaking',
  label: 'Speaking',
  description: 'Talks, with a link to video or slides.',
  priority: 'could',
  businessRef: 'BR 10',
  cardinality: 'collection',
  itemFields: [
    { key: 'date', label: 'Date', kind: 'date', group: 'meta' },
    { key: 'event', label: 'Event', kind: 'text', group: 'meta' },
    { key: 'title', label: 'Talk', kind: 'text', required: true },
    { key: 'url', label: 'Video or slides', kind: 'url', group: 'links' },
  ],
  emptyCondition: (content) =>
    collectionIsEmpty(
      content,
      (item) => isRecord(item) && hasText(item.title),
    ),
} as const satisfies CollectionSectionDescriptor;
