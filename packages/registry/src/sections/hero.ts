import type { SingleSectionDescriptor } from '../types';
import { allBlank } from '../empty';

export const hero = {
  type: 'hero',
  label: 'Hero',
  description: 'Who you are, in one screen.',
  priority: 'must',
  businessRef: 'BR 1',
  cardinality: 'single',
  fields: [
    {
      key: 'title',
      label: 'Professional title',
      kind: 'text',
      required: true,
      group: 'intro',
      help: 'Rendered as the eyebrow above your name.',
    },
    {
      key: 'name',
      label: 'Name',
      kind: 'text',
      required: true,
      group: 'intro',
    },
    {
      key: 'tagline',
      label: 'Tagline',
      kind: 'text',
      group: 'intro',
      max: 120,
      help: 'One or two lines. What you do, not what you are called.',
    },
    {
      key: 'bio',
      label: 'Short bio',
      kind: 'longtext',
      group: 'intro',
      max: 400,
      help: 'Two or three sentences.',
    },
    {
      key: 'ctas',
      label: 'Calls to action',
      kind: 'list',
      group: 'intro',
      max: 2,
      help: 'The first renders as the primary button.',
    },
    { key: 'avatar', label: 'Photo', kind: 'image', group: 'portrait' },
  ],
  emptyCondition: (content) =>
    allBlank(content, ['name', 'title', 'tagline', 'bio', 'ctas', 'avatar']),
} as const satisfies SingleSectionDescriptor;
