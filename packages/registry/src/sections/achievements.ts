import type { CollectionSectionDescriptor } from '../types';
import { collectionIsEmpty, hasText, isRecord } from '../empty';

export const achievements = {
  type: 'achievements',
  label: 'Achievements',
  description: 'Certifications, awards, rankings, hackathons.',
  priority: 'should',
  businessRef: 'BR 11',
  cardinality: 'collection',
  sectionFields: [
    {
      key: 'credlyUsername',
      label: 'Credly username',
      kind: 'text',
      help: 'Used once to import your badges. Not stored as a live connection.',
    },
  ],
  /*
   * One flat collection, imported and hand-written items side by side. The
   * badge fields sit at the top of the render order because a badge leads
   * with its picture; an item that has none simply skips them, which is how
   * a manual achievement keeps exactly the layout it had before Credly
   * existed (FR-REG-2).
   */
  itemFields: [
    {
      key: 'source',
      label: 'Source',
      kind: 'enum',
      options: ['manual', 'credly'],
      defaultValue: 'manual',
      hidden: true,
    },
    {
      key: 'credlyBadgeId',
      label: 'Credly badge',
      kind: 'text',
      help: 'Paste the embed code from Credly — we will pull the ID out of it.',
    },
    {
      key: 'type',
      label: 'Type',
      kind: 'enum',
      options: ['certification', 'award', 'ranking', 'hackathon'],
      group: 'meta',
    },
    { key: 'date', label: 'Date', kind: 'date', group: 'meta' },
    { key: 'title', label: 'Title', kind: 'text', required: true },
    { key: 'issuer', label: 'Issuer', kind: 'text' },
    { key: 'url', label: 'Details', kind: 'url', group: 'links' },
    {
      key: 'verifyUrl',
      label: 'Verification link',
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
