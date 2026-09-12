import { MEDIA_HOST } from '../ids';
import type { SeedTenant } from '../tenant';

/*
 * The second real tenant, so the cross-tenant isolation suite (NFR-SEC-1) has
 * genuine ids to attempt an admin endpoint with rather than a fabricated one.
 *
 * **Every field differs from alice's.** Not only the names: the provider, the
 * theme, the analytics provider, the project count, the skill count, the
 * prominent count, the categories, the ratings, the link visibility. A test
 * that leaks bob's content into alice's response fails on whichever field it
 * happens to assert on, instead of passing because the two fixtures happened
 * to agree there.
 */
export const bob: SeedTenant = {
  name: 'bob',
  user: {
    provider: 'google',
    providerId: 'goog-bob-2002',
    email: 'bob@example.net',
    displayName: 'Bob Ferreira',
    avatarUrl: `${MEDIA_HOST}/bob/avatar.jpg`,
    status: 'active',
  },
  slug: 'bob',
  status: 'published',
  presetId: 'software-engineer',
  version: 2,
  publish: true,
  media: [
    {
      sequence: 1,
      storageKey: 'bob/avatar.jpg',
      url: `${MEDIA_HOST}/bob/avatar.jpg`,
      mimeType: 'image/jpeg',
      bytes: 61804,
      width: 400,
      height: 400,
      altText: 'Bob Ferreira at a whiteboard',
    },
    {
      sequence: 2,
      storageKey: 'bob/atlas.webp',
      url: `${MEDIA_HOST}/bob/atlas.webp`,
      mimeType: 'image/webp',
      bytes: 94210,
      width: 1600,
      height: 900,
      altText: 'Design system documentation site showing a component gallery',
    },
    {
      sequence: 3,
      storageKey: 'bob/kiosk.webp',
      url: `${MEDIA_HOST}/bob/kiosk.webp`,
      mimeType: 'image/webp',
      bytes: 112376,
      width: 1600,
      height: 900,
      altText: 'Self-service kiosk screen mid-order',
    },
    {
      sequence: 4,
      storageKey: 'bob/transcript.webp',
      url: `${MEDIA_HOST}/bob/transcript.webp`,
      mimeType: 'image/webp',
      bytes: 88914,
      width: 1600,
      height: 900,
      altText: 'Live transcript panel beside a video player',
    },
  ],
  draft: {
    theme: {
      accent: '#c2410c',
      accentInk: '#7c2d12',
      accentOn: '#fffbf7',
      mode: 'dark',
      fontPairing: 'serif-mono',
    },
    seo: {
      title: 'Bob Ferreira — Frontend and accessibility',
      description:
        'Twelve years on interfaces people have to use rather than choose to. Accessibility is the work, not a pass at the end.',
      keywords: ['frontend', 'accessibility', 'design systems', 'WCAG'],
      ogImageUrl: `${MEDIA_HOST}/bob/og.png`,
    },
    analytics: { provider: 'ga', id: 'G-BOB4417XZ' },
    sections: [
      {
        type: 'hero',
        enabled: true,
        order: 0,
        content: {
          name: 'Bob Ferreira',
          title: 'Frontend engineer, accessibility lead',
          tagline: 'Interfaces for people who did not choose the software.',
          bio: 'Twelve years on public-sector and retail frontends, where the user cannot switch to a competitor. I treat accessibility as the specification rather than an audit finding.',
          ctas: [
            {
              kind: 'url',
              label: 'See the component library',
              href: 'https://atlas.example.org',
            },
          ],
          avatar: {
            src: `${MEDIA_HOST}/bob/avatar.jpg`,
            alt: 'Bob Ferreira at a whiteboard',
            width: 400,
            height: 400,
          },
        },
      },
      {
        type: 'projects',
        enabled: true,
        order: 1,
        content: {
          categories: ['Design systems', 'Accessibility'],
          items: [
            {
              id: 'bob-atlas',
              title: 'Atlas design system',
              category: 'Design systems',
              year: '2026',
              screenshot: {
                src: `${MEDIA_HOST}/bob/atlas.webp`,
                alt: 'Design system documentation site showing a component gallery',
                width: 1600,
                height: 900,
              },
              problem:
                'Nine product teams shipped nine date pickers, four of which were unusable with a keyboard.',
              impact:
                'One date picker now. Keyboard defects across the estate fell from 61 open to 3 in a year.',
              stack: ['TypeScript', 'React', 'CSS'],
              solution:
                'A component library whose accessibility behaviour is tested, not documented, so a team cannot adopt the component and lose the behaviour.',
              role: 'I owned the library and its test harness.',
              demoUrl: 'https://atlas.example.org',
              repoUrl: 'https://github.com/example/atlas',
              confidential: false,
              designation: 'Principal frontend engineer',
              bodies: {
                business:
                  '<p>Nine teams had each solved the same problems badly and separately. The cost was not the duplicated effort, which was modest. It was that a fix for one date picker fixed nothing else.</p><p>Two of the nine failed a statutory accessibility audit, and the remediation budget was larger than the library would have cost to build.</p>',
                solution:
                  '<p>A component library where the accessible behaviour is enforced by tests that ship with the component.</p><ul><li>Every component has a keyboard-interaction test derived from the WAI-ARIA pattern</li><li>Every component has an axe pass in CI, run against a real DOM</li><li>Adoption is measured, so a team still on its own date picker is visible</li></ul><p>Documentation alone was tried first, by someone else, and did not hold.</p>',
                role: '<p>I owned the library and the test harness that makes it stick.</p><p>I wrote the keyboard-interaction harness, migrated the first three teams myself so that the migration guide was written by someone who had done it, and ran the fortnightly clinic where teams brought their own components to fix.</p>',
              },
              stackWorkedOn: ['TypeScript', 'React', 'CSS'],
              tools: ['Storybook', 'Playwright', 'axe-core'],
              fullStack: ['TypeScript', 'React', 'CSS', 'Node.js', 'Rollup'],
            },
            {
              id: 'bob-kiosk',
              title: 'Self-service kiosk interface',
              category: 'Accessibility',
              year: '2025',
              screenshot: {
                src: `${MEDIA_HOST}/bob/kiosk.webp`,
                alt: 'Self-service kiosk screen mid-order',
                width: 1600,
                height: 900,
              },
              problem:
                'A kiosk built for a standing adult of average height excluded wheelchair users and anyone with low vision.',
              impact:
                'Completion rate for assisted users rose from 34% to 88%. Average order time fell 19 seconds for everyone.',
              stack: ['TypeScript', 'Svelte'],
              solution:
                'A single layout that reflows to a reachable zone, with text scaling and a screen-reader path that were designed in rather than added.',
              role: 'I rebuilt the interaction layer and ran the user testing.',
              demoUrl: 'https://kiosk.example.org',
              repoUrl: 'https://github.com/example/kiosk-ui',
              confidential: false,
              designation: 'Lead engineer, in-store systems',
              bodies: {
                business:
                  '<p>The kiosk was the only way to order at forty sites after the counter closed. A customer who could not use it did not get served.</p><p>Store staff were absorbing the failure by taking orders manually, which was invisible in the numbers until we asked them.</p>',
                solution:
                  '<p>One layout, reflowed rather than duplicated into an accessible mode.</p><ol><li>All interactive targets sit inside a reachable band, at any height setting</li><li>Text scales to 200% without a horizontal scroll</li><li>The screen-reader path is the same path, not a parallel simplified one</li></ol><p>A separate accessible mode was rejected early: it would have been the version that stopped getting updated.</p>',
                role: '<p>I rebuilt the interaction layer and ran the testing that shaped it.</p><p>I ran sessions with fourteen customers across four sites, including five wheelchair users and three screen-reader users, and I rewrote the reachable-band logic twice on what those sessions showed. I did not design the hardware mount, which set the constraint I worked inside.</p>',
              },
              stackWorkedOn: ['TypeScript', 'Svelte'],
              tools: ['Playwright', 'NVDA', 'Figma'],
              fullStack: ['TypeScript', 'Svelte', 'Rust', 'SQLite'],
            },
            {
              id: 'bob-transcript',
              title: 'Live transcript for training video',
              category: 'Accessibility',
              year: '2024',
              screenshot: {
                src: `${MEDIA_HOST}/bob/transcript.webp`,
                alt: 'Live transcript panel beside a video player',
                width: 1600,
                height: 900,
              },
              problem:
                'Mandatory training was video-only, so deaf staff completed it by guesswork or not at all.',
              impact:
                'Completion among staff using the transcript went from 41% to 97% in one cycle.',
              stack: ['TypeScript', 'Web Components'],
              solution:
                'A synchronised transcript panel that is navigable on its own, so the transcript is a way through the material rather than a caption track.',
              role: 'I built the transcript component and the sync format.',
              demoUrl: 'https://learn.example.org',
              repoUrl: 'https://github.com/example/transcript',
              confidential: false,
              designation: 'Senior frontend engineer',
              bodies: {
                business:
                  '<p>The training was a legal requirement and the video was the only form it existed in. Captions had been added and were not enough: a caption cannot be searched, skimmed, or returned to.</p>',
                solution:
                  '<p>A transcript panel that is a first-class way through the material.</p><ul><li>Clicking a paragraph seeks the video, and playing the video tracks the paragraph</li><li>The transcript is searchable and printable on its own</li><li>The sync format is plain text with timestamps, so it survives the video being re-encoded</li></ul>',
                role: '<p>I built the component and chose the sync format.</p><p>I argued for a plain-text format against a binary one that was faster to parse, because the training team maintains these files by hand and would have been locked out of their own content. Parsing was never the bottleneck.</p>',
              },
              stackWorkedOn: ['TypeScript', 'Web Components'],
              tools: ['Playwright', 'VoiceOver'],
              fullStack: ['TypeScript', 'Web Components', 'Python', 'FFmpeg'],
            },
          ],
        },
      },
      {
        type: 'skills',
        enabled: true,
        order: 2,
        content: {
          categories: ['Frontend', 'Accessibility', 'Tools & Practices'],
          items: [
            {
              id: 'bob-typescript',
              name: 'TypeScript',
              category: 'Frontend',
              rating: 10,
              prominent: true,
              order: 0,
            },
            {
              id: 'bob-css',
              name: 'CSS architecture',
              category: 'Frontend',
              rating: 9,
              prominent: true,
              order: 1,
            },
            {
              id: 'bob-svelte',
              name: 'Svelte',
              category: 'Frontend',
              rating: 8,
              prominent: true,
              order: 2,
            },
            {
              id: 'bob-react',
              name: 'React',
              category: 'Frontend',
              rating: 8,
              prominent: false,
              order: 3,
            },
            {
              id: 'bob-wcag',
              name: 'WCAG 2.2',
              category: 'Accessibility',
              rating: 10,
              prominent: true,
              order: 0,
            },
            {
              id: 'bob-aria',
              name: 'WAI-ARIA patterns',
              category: 'Accessibility',
              rating: 9,
              prominent: true,
              order: 1,
            },
            {
              id: 'bob-screenreaders',
              name: 'Screen reader testing',
              category: 'Accessibility',
              rating: 8,
              prominent: false,
              order: 2,
            },
            {
              id: 'bob-playwright',
              name: 'Playwright',
              category: 'Tools & Practices',
              rating: 7,
              prominent: false,
              order: 0,
            },
          ],
        },
      },
      {
        type: 'contact',
        enabled: true,
        order: 3,
        content: {
          intro:
            'Accessibility reviews and design-system work. LinkedIn is slowest.',
          email: {
            label: 'Email',
            value: 'bob@example.net',
            href: 'mailto:bob@example.net',
            visible: true,
          },
          github: {
            label: 'GitHub',
            value: 'bferreira',
            href: 'https://github.com/bferreira',
            visible: true,
          },
          linkedin: {
            label: 'LinkedIn',
            value: 'bob-ferreira',
            href: 'https://linkedin.com/in/bob-ferreira',
            visible: false,
          },
          x: {
            label: 'X',
            value: 'boba11y',
            href: 'https://x.com/boba11y',
            visible: true,
          },
          site: {
            label: 'Site',
            value: 'ferreira.works',
            href: 'https://ferreira.works',
            visible: false,
          },
        },
      },
    ],
  },
};
