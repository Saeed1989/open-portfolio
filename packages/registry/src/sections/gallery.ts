import type { CollectionSectionDescriptor } from '../types';
import { collectionIsEmpty, hasText, isRecord } from '../empty';

export const gallery = {
  type: 'gallery',
  label: 'Gallery',
  description: 'Images and embedded video.',
  priority: 'could',
  businessRef: 'BR 12',
  cardinality: 'collection',
  itemFields: [
    { key: 'image', label: 'Image', kind: 'image' },
    { key: 'caption', label: 'Caption', kind: 'text' },
    { key: 'videoUrl', label: 'Video', kind: 'url', group: 'links' },
  ],
  emptyCondition: (content) =>
    collectionIsEmpty(
      content,
      (item) =>
        isRecord(item) && (isRecord(item.image) || hasText(item.videoUrl)),
    ),
} as const satisfies CollectionSectionDescriptor;
