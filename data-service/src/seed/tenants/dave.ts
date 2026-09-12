import { MEDIA_HOST } from '../ids';
import type { SeedTenant } from '../tenant';

/*
 * Suspended (FR-TEN-3).
 *
 * **Dave has a published tree on purpose.** A suspended tenant with no
 * published tree would 404 for the reason carol does — §2.4, nothing to serve
 * — and the suspension path would never be exercised. Dave is a tenant whose
 * content is complete and publishable and who must still get a 404 that does
 * not disclose that the slug is registered.
 *
 * Both `users.status` and `portfolios.status` are set to `suspended`, because
 * which of the two governs the 404 is an open question (Q-7 in
 * docs/data-design.md). Setting both keeps the fixture valid under either
 * answer; when the question is settled, the losing field should be set back to
 * active so that the fixture tests the field that actually decides.
 */
export const dave: SeedTenant = {
  name: 'dave',
  user: {
    provider: 'google',
    providerId: 'goog-dave-4004',
    email: 'dave@example.co',
    displayName: 'Dave Lindqvist',
    avatarUrl: `${MEDIA_HOST}/dave/avatar.png`,
    status: 'suspended',
  },
  slug: 'dave',
  status: 'suspended',
  presetId: 'software-engineer',
  version: 1,
  publish: true,
  media: [
    {
      sequence: 1,
      storageKey: 'dave/avatar.png',
      url: `${MEDIA_HOST}/dave/avatar.png`,
      mimeType: 'image/png',
      bytes: 41220,
      width: 480,
      height: 480,
      altText: 'Dave Lindqvist in profile',
    },
  ],
  draft: {
    theme: {
      accent: '#6d28d9',
      accentInk: '#4c1d95',
      accentOn: '#ffffff',
      mode: 'light',
      fontPairing: 'grotesk-inter',
    },
    seo: {
      title: 'Dave Lindqvist — Mobile engineer',
      description: 'Android, mostly offline, mostly in the field.',
      keywords: ['android', 'kotlin', 'offline-first'],
    },
    analytics: null,
    sections: [
      {
        type: 'hero',
        enabled: true,
        order: 0,
        content: {
          name: 'Dave Lindqvist',
          title: 'Mobile engineer',
          tagline: 'Android apps that work where the signal does not.',
          bio: 'Seven years on field-service and survey apps for people working out of range of a tower.',
          ctas: [
            {
              kind: 'url',
              label: 'GitHub',
              href: 'https://github.com/dlindqvist',
            },
          ],
          avatar: {
            src: `${MEDIA_HOST}/dave/avatar.png`,
            alt: 'Dave Lindqvist in profile',
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
          categories: ['Mobile'],
          items: [
            {
              id: 'dave-survey',
              title: 'Offline survey capture',
              category: 'Mobile',
              year: '2025',
              problem:
                'Surveyors lost a day of work whenever the app was opened out of coverage and failed to sync.',
              impact:
                'Lost survey days went from roughly four a month to zero across eleven months.',
              stack: ['Kotlin', 'SQLDelight'],
              solution:
                'A local-first store where sync is a background reconciliation rather than a precondition for using the app.',
              role: 'I designed the local store and the conflict rules.',
              repoUrl: 'https://github.com/example/survey-offline',
              confidential: false,
              designation: 'Senior Android engineer',
              bodies: {
                business:
                  '<p>Surveyors work in places chosen for what is under the ground, not for tower coverage. The app assumed a connection and degraded badly without one.</p>',
                solution:
                  '<p>The device became the source of truth for work in progress.</p><ul><li>Every capture is written locally first and is immediately usable</li><li>Sync reconciles in the background and never blocks the interface</li><li>Conflicts are resolved by capture time, and a losing edit is kept rather than discarded</li></ul>',
                role: '<p>I designed the local store and the conflict rules.</p><p>I kept losing edits instead of dropping them after a surveyor lost half a day to a silent overwrite. Nobody asked for that; it was the right call and it cost very little.</p>',
              },
              stackWorkedOn: ['Kotlin', 'SQLDelight'],
              tools: ['Gradle', 'Firebase Crashlytics'],
              fullStack: ['Kotlin', 'SQLDelight', 'Go', 'PostgreSQL'],
            },
            {
              id: 'dave-dispatchapp',
              title: 'Field dispatch companion',
              category: 'Mobile',
              year: '2024',
              problem:
                'Engineers carried a paper job sheet because the app took nine seconds to show the day.',
              impact:
                'Day view went from 9s to under 400ms. Paper sheets stopped being printed after two months.',
              stack: ['Kotlin', 'Jetpack Compose'],
              solution:
                'A pre-warmed day view backed by a local projection, refreshed on a push rather than on open.',
              role: 'I rebuilt the day view and the projection behind it.',
              repoUrl: 'https://github.com/example/dispatch-companion',
              confidential: false,
              designation: 'Android engineer',
              bodies: {
                business:
                  '<p>The paper sheet was the tell. Engineers had quietly decided the app was not worth waiting for, and the dispatch team was printing for them.</p>',
                solution:
                  '<p>The day is projected locally and kept warm.</p><ol><li>A push updates the projection when the schedule changes</li><li>Opening the app reads the projection and renders immediately</li><li>A network fetch happens after the first paint, never before it</li></ol>',
                role: '<p>I rebuilt the day view and the projection behind it.</p><p>I measured first and found the nine seconds was four round trips, not rendering, which is where the previous attempt had spent its effort.</p>',
              },
              stackWorkedOn: ['Kotlin', 'Jetpack Compose'],
              tools: ['Gradle', 'Perfetto'],
              fullStack: ['Kotlin', 'Jetpack Compose', 'Go', 'PostgreSQL'],
            },
            {
              id: 'dave-assets',
              title: 'Asset tagging with NFC',
              category: 'Mobile',
              year: '2023',
              problem:
                'Asset audits were typed from handwritten notes and disagreed with the register by about 12%.',
              impact:
                'Register disagreement fell to under 1% at the first audit after rollout.',
              stack: ['Kotlin'],
              solution:
                'An NFC tap that records an asset against a location, with the register reconciled afterwards rather than during the walk.',
              role: 'I built the capture flow.',
              repoUrl: 'https://github.com/example/asset-tag',
              confidential: false,
              designation: 'Android engineer',
              bodies: {
                business:
                  '<p>The audit was a walk with a clipboard, typed up later. Every step of that added error, and the register was what insurance relied on.</p>',
                solution:
                  '<p>A tap replaces the note.</p><ul><li>An NFC tap records asset and location together</li><li>The walk never blocks on a lookup</li><li>Reconciliation against the register happens afterwards, where a disagreement can be inspected</li></ul>',
                role: '<p>I built the capture flow.</p><p>I made the walk entirely local after watching an auditor wait eleven seconds for a lookup and then start writing on paper again.</p>',
              },
              stackWorkedOn: ['Kotlin'],
              tools: ['Gradle'],
              fullStack: ['Kotlin', 'Go', 'PostgreSQL'],
            },
          ],
        },
      },
      {
        type: 'skills',
        enabled: true,
        order: 2,
        content: {
          categories: ['Mobile', 'Backend'],
          items: [
            {
              id: 'dave-kotlin',
              name: 'Kotlin',
              category: 'Mobile',
              rating: 9,
              prominent: true,
              order: 0,
            },
            {
              id: 'dave-compose',
              name: 'Jetpack Compose',
              category: 'Mobile',
              rating: 8,
              prominent: true,
              order: 1,
            },
            {
              id: 'dave-android',
              name: 'Android platform',
              category: 'Mobile',
              rating: 9,
              prominent: true,
              order: 2,
            },
            {
              id: 'dave-sqldelight',
              name: 'SQLDelight',
              category: 'Mobile',
              rating: 7,
              prominent: true,
              order: 3,
            },
            {
              id: 'dave-go',
              name: 'Go',
              category: 'Backend',
              rating: 6,
              prominent: true,
              order: 0,
            },
            {
              id: 'dave-postgres',
              name: 'PostgreSQL',
              category: 'Backend',
              rating: 6,
              prominent: false,
              order: 1,
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
            value: 'dave@example.co',
            href: 'mailto:dave@example.co',
            visible: true,
          },
          github: {
            label: 'GitHub',
            value: 'dlindqvist',
            href: 'https://github.com/dlindqvist',
            visible: true,
          },
        },
      },
    ],
  },
};
