import type { CollectionSectionDescriptor } from '../types';
import { collectionIsEmpty, hasText, isRecord } from '../empty';

export const blog = {
  type: 'blog',
  label: 'Writing',
  description: 'Posts, entered manually or synced from a feed.',
  priority: 'should',
  businessRef: 'BR 7',
  cardinality: 'collection',
  itemFields: [
    { key: 'date', label: 'Date', kind: 'date', group: 'meta' },
    { key: 'title', label: 'Title', kind: 'text', required: true },
    { key: 'summary', label: 'Summary', kind: 'longtext' },
    {
      key: 'url',
      label: 'Read the post',
      kind: 'url',
      required: true,
      group: 'links',
    },
  ],
  emptyCondition: (content) =>
    collectionIsEmpty(
      content,
      (item) => isRecord(item) && hasText(item.title) && hasText(item.url),
    ),
} as const satisfies CollectionSectionDescriptor;
