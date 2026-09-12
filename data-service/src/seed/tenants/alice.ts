import { MEDIA_HOST } from '../ids';
import type { SeedTenant } from '../tenant';

/*
 * The happy path, and the fixture the frontend develops against.
 *
 * Published, all four Must sections enabled and complete: four projects, one
 * of them confidential and therefore carrying no repository link
 * (FR-SEC-PROJ-3, FR-SEC-PROJ-4), and twelve skills of which six are prominent
 * — inside FR-SEC-SKILL-3's five-to-eight band.
 *
 * Every project carries all seven modal-level fields, so
 * `validateProjectsForPublish` returns nothing for this tenant. That is the
 * assertion the fixture exists to support.
 */
export const alice: SeedTenant = {
  name: 'alice',
  user: {
    provider: 'github',
    providerId: 'gh-alice-1001',
    email: 'alice@example.com',
    displayName: 'Alice Nakamura',
    avatarUrl: `${MEDIA_HOST}/alice/avatar.png`,
    status: 'active',
  },
  slug: 'alice',
  status: 'published',
  presetId: 'software-engineer',
  version: 4,
  publish: true,
  media: [
    {
      sequence: 1,
      storageKey: 'alice/avatar.png',
      url: `${MEDIA_HOST}/alice/avatar.png`,
      mimeType: 'image/png',
      bytes: 48211,
      width: 512,
      height: 512,
      altText: 'Alice Nakamura, head and shoulders',
    },
    {
      sequence: 2,
      storageKey: 'alice/ledger.png',
      url: `${MEDIA_HOST}/alice/ledger.png`,
      mimeType: 'image/png',
      bytes: 182904,
      width: 1280,
      height: 800,
      altText: 'Reconciliation dashboard showing matched and unmatched ledgers',
    },
    {
      sequence: 3,
      storageKey: 'alice/dispatch.png',
      url: `${MEDIA_HOST}/alice/dispatch.png`,
      mimeType: 'image/png',
      bytes: 205118,
      width: 1280,
      height: 800,
      altText: 'Dispatch map with live courier positions and route overlays',
    },
    {
      sequence: 4,
      storageKey: 'alice/schema-registry.png',
      url: `${MEDIA_HOST}/alice/schema-registry.png`,
      mimeType: 'image/png',
      bytes: 143002,
      width: 1280,
      height: 800,
      altText: 'Schema registry compatibility report for a topic',
    },
    {
      sequence: 5,
      storageKey: 'alice/claims.png',
      url: `${MEDIA_HOST}/alice/claims.png`,
      mimeType: 'image/png',
      bytes: 167450,
      width: 1280,
      height: 800,
      altText: 'Claims triage queue grouped by settlement band',
    },
  ],
  draft: {
    theme: {
      accent: '#2f5bff',
      accentInk: '#1b3ac2',
      accentOn: '#ffffff',
      mode: 'light',
      fontPairing: 'grotesk-spline',
    },
    seo: {
      title: 'Alice Nakamura — Backend engineer',
      description:
        'Nine years on payments and logistics backends. I make slow, fragile pipelines fast and boring.',
      keywords: ['backend engineer', 'Go', 'Kafka', 'payments'],
      ogImageUrl: `${MEDIA_HOST}/alice/og.png`,
    },
    analytics: { provider: 'plausible', id: 'alice.site.com' },
    sections: [
      {
        type: 'hero',
        enabled: true,
        order: 0,
        content: {
          name: 'Alice Nakamura',
          title: 'Backend engineer',
          tagline:
            'Payments and logistics systems that stay boring under load.',
          bio: 'Nine years building the parts of a business that cannot be down: settlement, dispatch, reconciliation. I work close to the data, and I measure before I change anything.',
          ctas: [
            {
              kind: 'resume',
              label: 'Download CV',
              href: `${MEDIA_HOST}/alice/cv.pdf`,
            },
            {
              kind: 'schedule',
              label: 'Book a chat',
              href: 'https://cal.example.com/alice',
            },
          ],
          avatar: {
            src: `${MEDIA_HOST}/alice/avatar.png`,
            alt: 'Alice Nakamura, head and shoulders',
            width: 512,
            height: 512,
          },
        },
      },
      {
        type: 'projects',
        enabled: true,
        order: 1,
        content: {
          categories: ['Backend', 'Data', 'Platform'],
          items: [
            {
              id: 'alice-ledger',
              title: 'Ledger reconciliation engine',
              category: 'Backend',
              year: '2025',
              screenshot: {
                src: `${MEDIA_HOST}/alice/ledger.png`,
                alt: 'Reconciliation dashboard showing matched and unmatched ledgers',
                width: 1280,
                height: 800,
              },
              problem:
                'Month-end reconciliation took eleven days and three analysts, and still closed with unexplained variance.',
              impact:
                'Close went from eleven days to under four hours. Unexplained variance fell from 0.4% of volume to 0.002%.',
              stack: ['Go', 'PostgreSQL', 'Kafka'],
              solution:
                'A streaming matcher that reconciles continuously instead of in a month-end batch, with a deterministic replay for disputes.',
              role: 'I designed the matching engine and the replay store.',
              demoUrl: 'https://ledger.example.com',
              repoUrl: 'https://github.com/example/ledger-engine',
              confidential: false,
              designation: 'Lead backend engineer',
              bodies: {
                business:
                  '<p>Finance closed the month by hand. Three analysts pulled statements from four processors, matched them against the internal ledger in spreadsheets, and wrote off whatever would not line up.</p><p>The write-off was the problem. It was small as a share of volume and large in absolute terms, and nobody could say which processor it came from.</p>',
                solution:
                  '<p>I replaced the batch with a streaming matcher. Every ledger entry and every processor line lands on a topic, and the matcher pairs them as they arrive.</p><ul><li>Deterministic matching keyed on amount, currency and a normalised reference</li><li>A fuzzy second pass for references mangled by the processor</li><li>An append-only replay store, so any disputed match can be reconstructed exactly</li></ul>',
                role: '<p>I owned the matcher and the replay store end to end.</p><p>I wrote the normalisation rules with the finance team, built the deterministic and fuzzy passes, and designed the replay store so that a dispute six months old reconstructs the same result. I did <strong>not</strong> build the processor ingestion, which a second engineer owned.</p>',
              },
              stackWorkedOn: ['Go', 'PostgreSQL', 'Kafka'],
              tools: ['Datadog', 'GitHub Actions', 'Terraform'],
              fullStack: ['Go', 'PostgreSQL', 'Kafka', 'Redis', 'React'],
            },
            {
              id: 'alice-dispatch',
              title: 'Courier dispatch rewrite',
              category: 'Platform',
              year: '2024',
              screenshot: {
                src: `${MEDIA_HOST}/alice/dispatch.png`,
                alt: 'Dispatch map with live courier positions and route overlays',
                width: 1280,
                height: 800,
              },
              problem:
                'Dispatch assigned couriers on a thirty-second cron, so a courier finishing a job waited half a minute for the next one.',
              impact:
                'Idle time per courier fell from 26 minutes to 9 minutes a shift, across a fleet of 340.',
              stack: ['Go', 'Redis', 'gRPC'],
              solution:
                'An event-driven assigner that reacts to job completion directly, with a cost function the operations team can tune.',
              role: 'I built the assigner and the tuning surface behind it.',
              demoUrl: 'https://dispatch.example.com',
              repoUrl: 'https://github.com/example/dispatch',
              confidential: false,
              designation: 'Senior backend engineer',
              bodies: {
                business:
                  '<p>Couriers are paid by the shift and earn by the job, so idle minutes cost the company and the courier at once.</p><p>The thirty-second cron was not a tuning problem. A courier who finished at second one waited twenty-nine seconds for a queue that already had work in it.</p>',
                solution:
                  '<p>Assignment became a reaction to an event rather than a sweep on a timer.</p><ol><li>Job completion publishes an event</li><li>The assigner scores every open job against the freed courier</li><li>The highest score wins, subject to a hard distance ceiling</li></ol><p>The cost function is data, not code, so operations retunes it without a deploy.</p>',
                role: '<p>I built the assigner, the scoring loop and the tuning surface.</p><p>I moved the cost function out of the binary and into a versioned document, and I wrote the shadow mode that scored the old and new assigners side by side for three weeks before we cut over.</p>',
              },
              stackWorkedOn: ['Go', 'Redis', 'gRPC'],
              tools: ['Grafana', 'GitHub Actions', 'Terraform'],
              fullStack: ['Go', 'Redis', 'gRPC', 'PostgreSQL', 'TypeScript'],
            },
            {
              id: 'alice-claims',
              title: 'Claims triage for a national insurer',
              category: 'Backend',
              year: '2023',
              screenshot: {
                src: `${MEDIA_HOST}/alice/claims.png`,
                alt: 'Claims triage queue grouped by settlement band',
                width: 1280,
                height: 800,
              },
              problem:
                'Every claim entered one queue in arrival order, so a straightforward settlement waited behind a contested one.',
              impact:
                'Median settlement time on low-value claims dropped from 9 days to 2. No change to the contested path.',
              stack: ['Python', 'PostgreSQL'],
              solution:
                'A triage step that routes claims into settlement bands on intake, with every routing decision recorded and reversible.',
              role: 'I built the triage service and its audit trail.',
              confidential: true,
              designation: 'Contract backend engineer',
              bodies: {
                business:
                  '<p>Client work, and the insurer is not named here.</p><p>Claims arrived into a single queue and were worked in arrival order. A claim that needed one signature sat behind a claim that needed a loss adjuster, and the cheap claims were the ones customers complained about.</p>',
                solution:
                  '<p>A triage step on intake sorts a claim into a settlement band before it reaches a queue.</p><ul><li>Band is derived from value, policy type and a small set of flags</li><li>Each band has its own queue and its own service target</li><li>Every routing decision is written to an audit trail and can be reversed by a handler</li></ul><p>Nothing about the contested path changed. It was already correct; it was only starving the rest.</p>',
                role: '<p>I built the triage service, the banding rules and the audit trail.</p><p>I worked the banding rules out with two senior handlers over a fortnight of shadowing, and I made every decision reversible because I did not trust the rules to be right at first. They were <em>not</em>, twice.</p>',
              },
              stackWorkedOn: ['Python', 'PostgreSQL'],
              tools: ['Sentry', 'GitLab CI'],
              fullStack: ['Python', 'PostgreSQL', 'RabbitMQ', 'Vue'],
            },
            {
              id: 'alice-schema-registry',
              title: 'Schema registry and compatibility gate',
              category: 'Data',
              year: '2023',
              screenshot: {
                src: `${MEDIA_HOST}/alice/schema-registry.png`,
                alt: 'Schema registry compatibility report for a topic',
                width: 1280,
                height: 800,
              },
              problem:
                'Producers changed event schemas without warning, and consumers found out in production.',
              impact:
                'Breaking-change incidents went from roughly one a fortnight to none in the fourteen months after rollout.',
              stack: ['Go', 'Kafka', 'Avro'],
              solution:
                'A registry that rejects an incompatible schema at CI time rather than at consume time.',
              role: 'I built the compatibility checker and the CI gate.',
              demoUrl: 'https://schemas.example.com',
              repoUrl: 'https://github.com/example/schema-gate',
              confidential: false,
              designation: 'Backend engineer, platform team',
              bodies: {
                business:
                  '<p>Thirty services exchanged events over forty topics with no agreement on what an event contained.</p><p>A producer adding a required field broke every consumer that read the topic, and the failure surfaced hours later as a dead letter queue nobody was watching.</p>',
                solution:
                  '<p>A registry holds the current schema for every topic, and CI refuses a change that is not backward compatible.</p><ul><li>Compatibility is checked against the last <em>three</em> published versions, not only the latest</li><li>The check runs in the producer pipeline, so the failure lands on the author</li><li>An explicit override exists and is recorded, because a genuine breaking change sometimes has to ship</li></ul>',
                role: '<p>I wrote the compatibility checker and the CI gate.</p><p>I chose to check three versions back rather than one after finding two consumers pinned to an older schema, and I added the override path because a gate with no escape hatch gets disabled by whoever first needs it at 2am.</p>',
              },
              stackWorkedOn: ['Go', 'Kafka', 'Avro'],
              tools: ['GitHub Actions', 'Buf', 'Datadog'],
              fullStack: ['Go', 'Kafka', 'Avro', 'PostgreSQL', 'React'],
            },
          ],
        },
      },
      {
        type: 'skills',
        enabled: true,
        order: 2,
        content: {
          categories: [
            'Backend',
            'Frontend',
            'Database',
            'DevOps',
            'Tools & Practices',
          ],
          legend:
            '9-10: I have designed and owned systems in it. 7-8: productive without reference. 5-6: effective with support.',
          items: [
            {
              id: 'alice-go',
              name: 'Go',
              category: 'Backend',
              rating: 9,
              prominent: true,
              order: 0,
            },
            {
              id: 'alice-python',
              name: 'Python',
              category: 'Backend',
              rating: 8,
              prominent: true,
              order: 1,
            },
            {
              id: 'alice-node',
              name: 'Node.js',
              category: 'Backend',
              rating: 7,
              prominent: false,
              order: 2,
            },
            {
              id: 'alice-typescript',
              name: 'TypeScript',
              category: 'Frontend',
              rating: 7,
              prominent: false,
              order: 0,
            },
            {
              id: 'alice-react',
              name: 'React',
              category: 'Frontend',
              rating: 6,
              prominent: false,
              order: 1,
            },
            {
              id: 'alice-postgres',
              name: 'PostgreSQL',
              category: 'Database',
              rating: 9,
              prominent: true,
              order: 0,
            },
            {
              id: 'alice-redis',
              name: 'Redis',
              category: 'Database',
              rating: 8,
              prominent: true,
              order: 1,
            },
            {
              id: 'alice-mongodb',
              name: 'MongoDB',
              category: 'Database',
              rating: 6,
              prominent: false,
              order: 2,
            },
            {
              id: 'alice-kafka',
              name: 'Kafka',
              category: 'DevOps',
              rating: 9,
              prominent: true,
              order: 0,
            },
            {
              id: 'alice-terraform',
              name: 'Terraform',
              category: 'DevOps',
              rating: 7,
              prominent: false,
              order: 1,
            },
            {
              id: 'alice-kubernetes',
              name: 'Kubernetes',
              category: 'DevOps',
              rating: 6,
              prominent: false,
              order: 2,
            },
            {
              id: 'alice-observability',
              name: 'Observability',
              category: 'Tools & Practices',
              rating: 8,
              prominent: true,
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
          intro: 'Open to backend and platform work. Fastest by email.',
          email: {
            label: 'Email',
            value: 'alice@example.com',
            href: 'mailto:alice@example.com',
            visible: true,
          },
          github: {
            label: 'GitHub',
            value: 'alice-nakamura',
            href: 'https://github.com/alice-nakamura',
            visible: true,
          },
          linkedin: {
            label: 'LinkedIn',
            value: 'alice-nakamura',
            href: 'https://linkedin.com/in/alice-nakamura',
            visible: true,
          },
          x: {
            label: 'X',
            value: 'alicebuilds',
            href: 'https://x.com/alicebuilds',
            visible: false,
          },
          site: {
            label: 'Site',
            value: 'alicenakamura.dev',
            href: 'https://alicenakamura.dev',
            visible: true,
          },
        },
      },
    ],
  },
};
