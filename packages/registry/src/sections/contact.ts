import type { SingleSectionDescriptor } from '../types';
import { hasText, isRecord } from '../empty';

export const contact = {
  type: 'contact',
  label: 'Contact',
  description: 'How to reach you. Each link toggles independently.',
  priority: 'must',
  businessRef: 'BR 4',
  cardinality: 'single',
  fields: [
    { key: 'intro', label: 'Intro', kind: 'longtext', max: 200 },
    { key: 'email', label: 'Email', kind: 'email', group: 'links' },
    { key: 'github', label: 'GitHub', kind: 'link', group: 'links' },
    { key: 'linkedin', label: 'LinkedIn', kind: 'link', group: 'links' },
    { key: 'x', label: 'X', kind: 'link', group: 'links' },
    { key: 'site', label: 'Personal site', kind: 'link', group: 'links' },
  ],
  emptyCondition: (content) => {
    if (!isRecord(content)) return true;
    const keys = ['email', 'github', 'linkedin', 'x', 'site'];
    return !keys.some((key) => {
      const link = content[key];
      return isRecord(link) && link.visible === true && hasText(link.value);
    });
  },
} as const satisfies SingleSectionDescriptor;
