import type { SingleSectionDescriptor } from '../types';
import { GITHUB_EMBED_CARDS } from '../content';
import { hasItems, hasText, isRecord } from '../empty';

export const opensource = {
  type: 'opensource',
  label: 'Open source',
  description: 'Profile, statistics, and named contributions.',
  priority: 'should',
  businessRef: 'BR 9',
  cardinality: 'single',
  fields: [
    { key: 'stats', label: 'Statistics', kind: 'list', group: 'stats' },
    {
      key: 'githubUsername',
      label: 'GitHub username',
      kind: 'text',
      group: 'github',
      max: 39,
      help: 'Just the username — not the full profile URL.',
    },
    {
      key: 'embedCards',
      label: 'Stat cards',
      kind: 'multiselect',
      group: 'github',
      options: GITHUB_EMBED_CARDS,
      defaultValue: ['stats', 'languages'],
      help: 'Drawn by GitHub’s card service in the visitor’s browser. A card that fails to load disappears; it never leaves a gap.',
    },
    { key: 'contributions', label: 'Contributions', kind: 'list', max: 3 },
    {
      key: 'profileUrl',
      label: 'GitHub profile',
      kind: 'url',
      group: 'links',
    },
  ],
  /*
   * The embed counts towards emptiness: a tenant whose only open-source
   * content is a username still has a section worth drawing, and one with
   * nothing at all still gets no heading (FR-CFG-2).
   */
  emptyCondition: (content) => {
    if (!isRecord(content)) return true;
    const stats = content.stats;
    const hasStats =
      isRecord(stats) &&
      Object.values(stats).some((value) => typeof value === 'number');
    return (
      !hasText(content.githubUsername) &&
      !hasStats &&
      !hasItems(content.contributions) &&
      !hasText(content.profileUrl)
    );
  },
} as const satisfies SingleSectionDescriptor;
