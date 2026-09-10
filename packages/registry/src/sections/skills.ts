import type { CollectionSectionDescriptor } from '../types';
import { collectionIsEmpty, hasText, isRecord } from '../empty';

export const skills = {
  type: 'skills',
  label: 'Prominent skills',
  description: 'One list, two tiers.',
  priority: 'must',
  businessRef: 'BR 3',
  cardinality: 'collection',
  sectionFields: [
    { key: 'legend', label: 'Rating scale legend', kind: 'longtext' },
    { key: 'categories', label: 'Categories', kind: 'tags' },
  ],
  itemFields: [
    {
      key: 'name',
      label: 'Skill',
      kind: 'text',
      required: true,
      group: 'headline',
    },
    {
      key: 'rating',
      label: 'Rating',
      kind: 'number',
      required: true,
      group: 'headline',
      help: '1-10. Always rendered as text beside the bar.',
    },
    { key: 'category', label: 'Category', kind: 'text', required: true },
    {
      key: 'prominent',
      label: 'Feature in the prominent tier',
      kind: 'boolean',
      help: 'Between five and eight skills, enforced at publish.',
    },
  ],
  emptyCondition: (content) =>
    collectionIsEmpty(
      content,
      (item) => isRecord(item) && hasText(item.name),
    ),
} as const satisfies CollectionSectionDescriptor;
