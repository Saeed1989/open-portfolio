import { MEDIA_HOST } from '../ids';
import type { SeedTenant } from '../tenant';

/*
 * Draft only. No published tree, so `/public/portfolios/carol` 404s (§2.4).
 *
 * Deliberately incomplete, so that publish validation has something real to
 * fail on. A draft is *allowed* to be in this state — FR-REG-8 validates
 * shape, type and enumeration at save and defers `required` to publish — so
 * nothing here is a malformed document. It is a half-written one.
 *
 * What a publish attempt should report, all at once (FR-PUB-6):
 *
 *   projects  2 items against a minimum of 3            FR-SEC-PROJ-2
 *   projects  items[0] bodies.solution, bodies.role,
 *             tools, fullStack empty                    FR-SEC-PROJ-11
 *   projects  items[1] designation, stackWorkedOn empty FR-SEC-PROJ-11
 *   projects  items[1] impact empty                     FR-SEC-PROJ-5
 *   skills    3 prominent against a band of 5 to 8      FR-SEC-SKILL-3
 *
 * Adding a field to any of these items weakens the fixture. If a test needs a
 * complete draft, use alice.
 */
export const carol: SeedTenant = {
  name: 'carol',
  user: {
    provider: 'github',
    providerId: 'gh-carol-3003',
    email: 'carol@example.org',
    displayName: 'Carol Adeyemi',
    avatarUrl: `${MEDIA_HOST}/carol/avatar.png`,
    status: 'active',
  },
  slug: 'carol',
  status: 'unpublished',
  presetId: 'software-engineer',
  version: 0,
  publish: false,
  media: [
    {
      sequence: 1,
      storageKey: 'carol/avatar.png',
      url: `${MEDIA_HOST}/carol/avatar.png`,
      mimeType: 'image/png',
      bytes: 39002,
      width: 480,
      height: 480,
      altText: 'Carol Adeyemi outdoors',
    },
  ],
  draft: {
    theme: {
      accent: '#0f766e',
      accentInk: '#115e59',
      accentOn: '#ffffff',
      mode: 'system',
      fontPairing: 'grotesk-inter',
    },
    seo: {
      title: 'Carol Adeyemi',
    },
    analytics: null,
    sections: [
      {
        type: 'hero',
        enabled: true,
        order: 0,
        content: {
          name: 'Carol Adeyemi',
          title: 'Data engineer',
          tagline: 'Pipelines that tell you when they are wrong.',
          bio: 'Six years moving data between systems that disagree about what a customer is.',
          ctas: [],
          avatar: {
            src: `${MEDIA_HOST}/carol/avatar.png`,
            alt: 'Carol Adeyemi outdoors',
            width: 480,
            height: 480,
          },
        },
      },
      {
        type: 'projects',
        enabled: true,
        order: 1,
        content: {
          categories: ['Data'],
          items: [
            {
              id: 'carol-lineage',
              title: 'Column-level lineage',
              category: 'Data',
              year: '2026',
              problem:
                'Nobody could say which dashboard broke when a column changed type.',
              impact:
                'Change review went from a two-day survey to a generated list.',
              stack: ['Python', 'dbt'],
              solution:
                'A parser that walks the warehouse SQL and records column-level dependencies.',
              role: 'I built the parser.',
              demoUrl: 'https://lineage.example.com',
              confidential: false,
              designation: 'Data engineer',
              bodies: {
                business:
                  '<p>A type change on one column could break any dashboard downstream of it, and the only way to find out was to ask around.</p>',
                /* Left empty on purpose: FR-SEC-PROJ-11. */
                solution: '',
                role: '',
              },
              stackWorkedOn: ['Python', 'dbt'],
              tools: [],
              fullStack: [],
            },
            {
              id: 'carol-cdc',
              title: 'Change data capture for the billing replica',
              category: 'Data',
              year: '2025',
              problem:
                'The billing replica lagged the primary by up to four hours at month end.',
              /* Left empty on purpose: FR-SEC-PROJ-5. */
              impact: '',
              stack: ['Debezium', 'Kafka'],
              solution: 'Replaced the nightly dump with change data capture.',
              role: 'I ran the migration.',
              repoUrl: 'https://github.com/example/billing-cdc',
              confidential: false,
              /* Left empty on purpose: FR-SEC-PROJ-11. */
              designation: '',
              bodies: {
                business:
                  '<p>Month end is when the replica matters and when it was furthest behind.</p>',
                solution:
                  '<p>Change data capture streams the primary into the replica continuously.</p>',
                role: '<p>I ran the migration and wrote the backfill.</p>',
              },
              stackWorkedOn: [],
              tools: ['Datadog'],
              fullStack: ['Debezium', 'Kafka', 'PostgreSQL'],
            },
          ],
        },
      },
      {
        type: 'skills',
        enabled: true,
        order: 2,
        content: {
          categories: ['Data', 'Backend'],
          items: [
            {
              id: 'carol-python',
              name: 'Python',
              category: 'Backend',
              rating: 9,
              prominent: true,
              order: 0,
            },
            {
              id: 'carol-sql',
              name: 'SQL',
              category: 'Data',
              rating: 9,
              prominent: true,
              order: 0,
            },
            {
              id: 'carol-dbt',
              name: 'dbt',
              category: 'Data',
              rating: 8,
              prominent: true,
              order: 1,
            },
            {
              id: 'carol-airflow',
              name: 'Airflow',
              category: 'Data',
              rating: 7,
              prominent: false,
              order: 2,
            },
            {
              id: 'carol-spark',
              name: 'Spark',
              category: 'Data',
              rating: 5,
              prominent: false,
              order: 3,
            },
          ],
        },
      },
      {
        type: 'contact',
        enabled: true,
        order: 3,
        content: {
          email: {
            label: 'Email',
            value: 'carol@example.org',
            href: 'mailto:carol@example.org',
            visible: true,
          },
          github: {
            label: 'GitHub',
            value: 'cadeyemi',
            href: 'https://github.com/cadeyemi',
            visible: true,
          },
        },
      },
    ],
  },
};
