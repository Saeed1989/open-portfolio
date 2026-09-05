import type { SectionDescriptor, SectionType } from './types';
import { GITHUB_EMBED_CARDS } from './content';
import {
  allBlank,
  collectionIsEmpty,
  hasItems,
  hasText,
  isRecord,
} from './empty';

/**
 * The twelve section descriptors — the single source of truth (FR-REG-1).
 *
 * The order of each `fields` / `itemFields` array is the public render order
 * (FR-REG-2). It is not a hint: section components iterate these arrays and
 * look up a renderer per key, so no component can drift from the declared
 * order, and every item in a collection is laid out identically by
 * construction.
 *
 * Where the approved design (design/portfolio.html) fixes an order, the array
 * below matches it — the design's project card reads screenshot, category,
 * year, title, Problem, Impact, Stack, then the Solution / My role
 * disclosure, then links.
 */
export const REGISTRY = {
  hero: {
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
  },

  projects: {
    type: 'projects',
    label: 'Selected work',
    description: 'Three to five projects, each scannable in fifteen seconds.',
    priority: 'must',
    businessRef: 'BR 2',
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
      { key: 'solution', label: 'Solution', kind: 'longtext', group: 'detail' },
      {
        key: 'role',
        label: 'My role',
        kind: 'longtext',
        group: 'detail',
        help: 'First person, named components.',
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
  },

  skills: {
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
  },

  contact: {
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
  },

  experience: {
    type: 'experience',
    label: 'Experience',
    description: 'Roles, most recent first.',
    priority: 'should',
    businessRef: 'BR 5',
    cardinality: 'collection',
    itemFields: [
      {
        key: 'title',
        label: 'Title',
        kind: 'text',
        required: true,
        group: 'headline',
      },
      {
        key: 'company',
        label: 'Company',
        kind: 'text',
        required: true,
        group: 'headline',
      },
      { key: 'startDate', label: 'From', kind: 'date', group: 'dates' },
      { key: 'endDate', label: 'To', kind: 'date', group: 'dates' },
      { key: 'description', label: 'Summary', kind: 'longtext' },
      {
        key: 'accomplishments',
        label: 'Accomplishments',
        kind: 'list',
        group: 'detail',
      },
    ],
    emptyCondition: (content) =>
      collectionIsEmpty(
        content,
        (item) =>
          isRecord(item) && (hasText(item.title) || hasText(item.company)),
      ),
  },

  education: {
    type: 'education',
    label: 'Education',
    description: 'Qualifications, with optional detail.',
    priority: 'should',
    businessRef: 'BR 6',
    cardinality: 'collection',
    itemFields: [
      {
        key: 'degree',
        label: 'Degree',
        kind: 'text',
        required: true,
        group: 'headline',
      },
      {
        key: 'institution',
        label: 'Institution',
        kind: 'text',
        required: true,
        group: 'headline',
      },
      { key: 'graduated', label: 'Graduated', kind: 'date', group: 'dates' },
      { key: 'gpa', label: 'GPA', kind: 'text', group: 'detail' },
      { key: 'coursework', label: 'Coursework', kind: 'tags', group: 'detail' },
      {
        key: 'scholarships',
        label: 'Scholarships',
        kind: 'list',
        group: 'detail',
      },
      { key: 'honours', label: 'Honours', kind: 'list', group: 'detail' },
    ],
    emptyCondition: (content) =>
      collectionIsEmpty(
        content,
        (item) =>
          isRecord(item) && (hasText(item.degree) || hasText(item.institution)),
      ),
  },

  blog: {
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
  },

  testimonials: {
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
  },

  opensource: {
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
  },

  speaking: {
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
  },

  achievements: {
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
  },

  gallery: {
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
  },
} as const satisfies Record<SectionType, SectionDescriptor>;

export type Registry = typeof REGISTRY;

export function getDescriptor(type: SectionType): SectionDescriptor {
  return REGISTRY[type];
}

/**
 * FR-CFG-2. An enabled section whose content satisfies this is omitted from
 * the page entirely — no heading, no wrapper, no empty state.
 */
export function isSectionEmpty(type: SectionType, content: unknown): boolean {
  return REGISTRY[type].emptyCondition(content);
}
