import type { CollectionSectionDescriptor } from '../types';
import { collectionIsEmpty, hasText, isRecord } from '../empty';

export const projects = {
  type: 'projects',
  label: 'Selected work',
  description: 'Three to five projects, each scannable in fifteen seconds.',
  priority: 'must',
  cardinality: 'collection',
  min: 3,
  max: 5,
  sectionFields: [
    { key: 'categories', label: 'Filter categories', kind: 'tags' },
  ],
  itemFields: [
    { key: 'screenshot', label: 'Screenshot', kind: 'image', group: 'shot' },
    { key: 'category', label: 'Category', kind: 'text', group: 'meta' },
    { key: 'year', label: 'Year', kind: 'text', group: 'meta' },
    { key: 'title', label: 'Title', kind: 'text', required: true },
    {
      key: 'problem',
      label: 'Problem',
      kind: 'longtext',
      required: true,
      group: 'summary',
    },
    {
      key: 'impact',
      label: 'Impact',
      kind: 'longtext',
      required: true,
      group: 'summary',
      help: 'Required. Where no metric exists, state what changed.',
    },
    { key: 'stack', label: 'Stack', kind: 'tags', group: 'summary' },
    /* Grouped with the summary above, not held back behind a disclosure:
       the card is one description list now that the case study has moved
       into the modal. */
    { key: 'solution', label: 'Solution', kind: 'longtext', group: 'summary' },
    {
      key: 'role',
      label: 'My role',
      kind: 'longtext',
      group: 'summary',
      help: 'One line for the card. The long account goes in "My role" below.',
    },
    /*
     * The case study behind the card. This order is also the modal's
     * sub-section order. `bodies.*` keys are dotted because the three
     * rich-text bodies nest under one object.
     */
    {
      key: 'bodies.business',
      label: 'Business case',
      kind: 'longtext',
      required: true,
      group: 'body',
      help: 'Plain paragraphs and lists. No links or images.',
    },
    {
      key: 'bodies.solution',
      label: 'Solution',
      kind: 'longtext',
      required: true,
      group: 'body',
      help: 'Plain paragraphs and lists. No links or images.',
    },
    {
      key: 'designation',
      label: 'My designation',
      kind: 'text',
      required: true,
      group: 'body',
      help: 'The title you held on this engagement, e.g. "Lead front-end engineer".',
    },
    {
      key: 'bodies.role',
      label: 'My role',
      kind: 'longtext',
      required: true,
      group: 'body',
      /* The writing guidance attaches here, not to the card's one-line `role`. */
      help: 'Plain paragraphs and lists. No links or images. First person, naming the components you owned — not "worked on".',
    },
    {
      key: 'stackWorkedOn',
      label: 'Tech stack I worked on',
      kind: 'tags',
      required: true,
      group: 'body',
      help: 'The part of the stack you personally touched. A subset of "Full tech stack".',
    },
    {
      key: 'tools',
      label: 'Tools',
      kind: 'tags',
      required: true,
      group: 'body',
      help: 'Non-runtime tooling — editors, CI, observability, design. Orthogonal to both stack lists, not a subset of either.',
    },
    {
      key: 'fullStack',
      label: 'Full tech stack',
      kind: 'tags',
      required: true,
      group: 'body',
      help: 'Everything the project runs on, including parts you did not work on. A superset of "Tech stack I worked on".',
    },
    { key: 'demoUrl', label: 'Live demo', kind: 'url', group: 'links' },
    { key: 'repoUrl', label: 'Source', kind: 'url', group: 'links' },
    {
      key: 'confidential',
      label: 'Confidential engagement',
      kind: 'boolean',
      group: 'links',
    },
  ],
  emptyCondition: (content) =>
    collectionIsEmpty(
      content,
      (item) => isRecord(item) && hasText(item.title),
    ),
} as const satisfies CollectionSectionDescriptor;
