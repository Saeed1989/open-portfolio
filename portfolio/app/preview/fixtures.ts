import type { TypedSectionInstance } from '@openportfolio/registry';

/**
 * A fully-populated portfolio, for comparing SectionRenderer's output against
 * design/portfolio.html.
 *
 * Development fixture only — nothing here is loaded by the public page, which
 * reads its sections from the API. The hero, projects, skills and contact
 * content is copied from the design's own data so the two can be held side by
 * side; the remaining eight sections are written in the same voice to exercise
 * every registry field.
 */
const SAMPLE_IMAGE = {
  src: '/styleguide-sample.svg',
  width: 320,
  height: 200,
};

export const fixtureSections: TypedSectionInstance[] = [
  {
    type: 'hero',
    enabled: true,
    order: 0,
    content: {
      name: 'Mira Okonkwo',
      title: 'Full-stack engineer · Lagos / remote',
      tagline: 'I build server-rendered products that stay fast under real traffic.',
      bio: 'Eight years across checkout, dispatch and internal tooling. I work close to the render path — measuring before rewriting, and shipping the smallest change that moves the number. Currently leading the front-end platform team at Ledgerwork.',
      ctas: [
        { kind: 'resume', label: 'Download résumé', href: '/styleguide-sample.svg' },
        { kind: 'schedule', label: 'Schedule a chat', href: '#contact' },
      ],
      avatar: { ...SAMPLE_IMAGE, alt: 'Mira Okonkwo' },
    },
  },

  {
    type: 'projects',
    enabled: true,
    order: 1,
    content: {
      categories: ['Frontend', 'Backend', 'Data', 'DevOps'],
      items: [
        {
          id: 'ledgerwork-checkout',
          title: 'Ledgerwork checkout',
          category: 'Frontend',
          year: '2025',
          screenshot: { ...SAMPLE_IMAGE, alt: 'The Ledgerwork checkout, mid-payment.' },
          problem:
            'A five-step checkout lost buyers at every hop, and the client-side bundle blocked first paint on mid-range Android.',
          solution:
            'Rebuilt it as one server-rendered page with progressive enhancement, so the form works before any JavaScript runs.',
          impact: 'Completion up 14 points; median load 2.4s to 880ms.',
          role: 'I architected the render path and the payment-state machine, and paired with two engineers on the form components.',
          stack: ['Rails', 'Hotwire', 'Stripe', 'Postgres'],
          demoUrl: 'https://example.com/ledgerwork',
          repoUrl: 'https://example.com/ledgerwork-source',
        },
        {
          id: 'beacon-design-system',
          title: 'Beacon design system',
          category: 'Frontend',
          year: '2024',
          screenshot: { ...SAMPLE_IMAGE, alt: 'The Beacon component catalogue.' },
          problem:
            'Nine product teams shipped four incompatible button implementations and no shared token source.',
          solution:
            '62 framework-agnostic components on one token pipeline, adopted incrementally with no migration freeze.',
          impact: 'Adopted by all nine teams in seven months; UI review time down by half.',
          role: 'I owned the token pipeline and the release process, and wrote the contribution model the teams still use.',
          stack: ['TypeScript', 'Lit', 'Style Dictionary'],
          demoUrl: 'https://example.com/beacon',
          repoUrl: 'https://example.com/beacon-source',
        },
        {
          id: 'freight-ops-console',
          title: 'Freight ops console',
          category: 'DevOps',
          year: '2023',
          screenshot: { ...SAMPLE_IMAGE, alt: 'The dispatch console on a tablet.' },
          problem:
            'Dispatchers ran 400 daily routes from a spreadsheet, on tablets that lose signal inside the yard.',
          solution:
            'Offline-first console with a local write queue and conflict review, keyboard-first for one-handed use.',
          impact: 'Route assignment down from 6 minutes to 40 seconds per load.',
          role: "I built the sync layer and the conflict-resolution UI; the mapping integration was a colleague's.",
          stack: ['React', 'IndexedDB', 'Mapbox'],
          demoUrl: 'https://example.com/freight',
          repoUrl: 'https://example.com/freight-source',
        },
        {
          id: 'council-records-search',
          title: 'Council records search',
          category: 'Data',
          year: '2022',
          screenshot: { ...SAMPLE_IMAGE, alt: 'A search result page of council minutes.' },
          problem:
            'A city of 1.2M published two decades of minutes as unsearchable scanned PDFs.',
          solution:
            'Full-text search over an OCR pipeline, with result pages that work in a screen reader and on a 2G connection.',
          impact: '31,000 documents indexed; tested end to end with two local advocacy groups.',
          role: 'I designed the index schema and the search UI, and ran the accessibility testing sessions.',
          stack: ['Django', 'Postgres FTS', 'Tesseract'],
          demoUrl: 'https://example.com/council',
          repoUrl: 'https://example.com/council-source',
        },
        {
          id: 'shift-planner',
          title: 'Shift planner (retail client)',
          category: 'Backend',
          year: '2021',
          screenshot: { ...SAMPLE_IMAGE, alt: 'The weekly rota grid.' },
          problem:
            'Managers built weekly rotas for hourly staff across six separate forms, and overtime went unnoticed until payroll.',
          solution:
            'One editable weekly grid with live cost and overtime totals, validated server-side against local labour rules.',
          impact: 'Rota build time cut from ~2 hours to 25 minutes per store.',
          role: 'I owned the scheduling rules engine and the cost calculations end to end.',
          stack: ['Vue', 'Go', 'Postgres'],
          demoUrl: 'https://example.com/shift-planner',
          confidential: true,
        },
      ],
    },
  },

  {
    type: 'skills',
    enabled: true,
    order: 2,
    content: {
      legend:
        'Rated out of 10: 9–10 I have designed and debugged it in production, 7–8 I work in it daily, 5–6 I am actively learning it.',
      categories: ['Frontend', 'Platform', 'Database', 'Practice'],
      items: [
        { id: 's1', name: 'TypeScript', category: 'Frontend', rating: 9, prominent: true },
        { id: 's2', name: 'React', category: 'Frontend', rating: 9, prominent: true },
        { id: 's3', name: 'CSS architecture', category: 'Frontend', rating: 9, prominent: true },
        { id: 's4', name: 'Server-rendered HTML', category: 'Frontend', rating: 8 },
        { id: 's5', name: 'Vue', category: 'Frontend', rating: 7 },
        { id: 's6', name: 'Lit / web components', category: 'Frontend', rating: 7 },
        { id: 's7', name: 'Design systems', category: 'Platform', rating: 9, prominent: true },
        { id: 's8', name: 'Build & release tooling', category: 'Platform', rating: 8, prominent: true },
        { id: 's9', name: 'Performance budgets', category: 'Platform', rating: 8, prominent: true },
        { id: 's10', name: 'Node.js', category: 'Platform', rating: 7 },
        { id: 's11', name: 'Edge runtimes', category: 'Platform', rating: 6 },
        { id: 's12', name: 'PostgreSQL', category: 'Database', rating: 7 },
        { id: 's13', name: 'Redis', category: 'Database', rating: 6 },
        { id: 's14', name: 'WCAG 2.1 AA audits', category: 'Practice', rating: 9 },
        { id: 's15', name: 'Testing strategy', category: 'Practice', rating: 8 },
        { id: 's16', name: 'Technical writing', category: 'Practice', rating: 8 },
        { id: 's17', name: 'Mentoring', category: 'Practice', rating: 7 },
      ],
    },
  },

  {
    type: 'experience',
    enabled: true,
    order: 3,
    content: {
      items: [
        {
          id: 'e1',
          company: 'Ledgerwork',
          title: 'Staff engineer, front-end platform',
          startDate: '2022',
          description:
            'Lead the platform team behind checkout and the internal component library.',
          accomplishments: [
            'Cut median checkout load from 2.4s to 880ms across nine markets.',
            'Introduced a performance budget enforced in CI, not in review.',
            'Mentored four engineers through their first platform-wide migration.',
          ],
        },
        {
          id: 'e2',
          company: 'Northwind Logistics',
          title: 'Senior engineer',
          startDate: '2019',
          endDate: '2022',
          description:
            'Built the dispatch tooling used daily by 200 yard staff on unreliable connections.',
          accomplishments: [
            'Designed the offline write queue and its conflict-review UI.',
            'Took the console from a 6-minute to a 40-second route assignment.',
          ],
        },
      ],
    },
  },

  {
    type: 'education',
    enabled: true,
    order: 4,
    content: {
      items: [
        {
          id: 'ed1',
          degree: 'BSc Computer Science',
          institution: 'University of Lagos',
          graduated: '2017',
          gpa: 'First class',
          coursework: ['Distributed systems', 'Compilers', 'Human-computer interaction'],
          scholarships: ['Faculty merit scholarship'],
          honours: ["Dean's list, three years"],
        },
      ],
    },
  },

  {
    type: 'opensource',
    enabled: true,
    order: 5,
    content: {
      profileUrl: 'https://example.com/github/miraok',
      stats: { repos: 34, stars: 2870, contributions: 1240 },
      contributions: [
        {
          id: 'oss1',
          name: 'style-dictionary',
          description: 'Token transform for CSS custom properties with theme scoping.',
          impact: 'Shipped in 4.2; used by the Beacon pipeline.',
          url: 'https://example.com/oss/style-dictionary',
        },
        {
          id: 'oss2',
          name: 'axe-core',
          description: 'Rule for progressbar elements missing an accessible value.',
          impact: 'Catches the failure mode this portfolio guards against.',
          url: 'https://example.com/oss/axe-core',
        },
      ],
    },
  },

  {
    type: 'blog',
    enabled: true,
    order: 6,
    content: {
      items: [
        {
          id: 'b1',
          title: 'Measuring before rewriting',
          date: '2025',
          summary:
            'How a checkout rewrite started with three weeks of field data and no code.',
          url: 'https://example.com/writing/measuring-first',
        },
        {
          id: 'b2',
          title: 'The token pipeline nobody has to think about',
          date: '2024',
          summary:
            'Nine teams, one source of truth, and the release process that kept it honest.',
          url: 'https://example.com/writing/token-pipeline',
        },
      ],
    },
  },

  {
    type: 'speaking',
    enabled: true,
    order: 7,
    content: {
      items: [
        {
          id: 'sp1',
          event: 'RenderConf',
          date: '2025',
          title: 'Progressive enhancement pays for itself',
          url: 'https://example.com/talks/progressive-enhancement',
        },
        {
          id: 'sp2',
          event: 'Lagos JS',
          date: '2024',
          title: 'Performance budgets in CI',
          url: 'https://example.com/talks/budgets',
        },
      ],
    },
  },

  {
    type: 'testimonials',
    enabled: true,
    order: 8,
    content: {
      items: [
        {
          id: 't1',
          quote:
            'Mira rewrote the part of our system everyone was afraid of, and the deploy was uneventful. That is the whole compliment.',
          name: 'Adaeze Nwosu',
          role: 'VP Engineering',
          company: 'Ledgerwork',
          photo: { ...SAMPLE_IMAGE, alt: 'Adaeze Nwosu' },
        },
        {
          id: 't2',
          quote:
            'She left the dispatch team with documentation they still use two years later, which says more than the launch did.',
          name: 'Tomas Bergstrom',
          role: 'Head of Operations',
          company: 'Northwind Logistics',
        },
      ],
    },
  },

  {
    type: 'achievements',
    enabled: true,
    order: 9,
    content: {
      items: [
        {
          id: 'a1',
          type: 'certification',
          title: 'IAAP Web Accessibility Specialist',
          issuer: 'IAAP',
          date: '2024',
          url: 'https://example.com/certs/was',
        },
        {
          id: 'a2',
          type: 'award',
          title: 'Engineering award for platform impact',
          issuer: 'Ledgerwork',
          date: '2023',
        },
      ],
    },
  },

  {
    type: 'gallery',
    enabled: true,
    order: 10,
    content: {
      items: [
        {
          id: 'g1',
          image: { ...SAMPLE_IMAGE, alt: 'The checkout render path, drawn on a whiteboard.' },
          caption: 'The render path, before any of it was code.',
        },
        {
          id: 'g2',
          image: { ...SAMPLE_IMAGE, alt: 'The dispatch console running in the yard.' },
          caption: 'The console in the yard, offline by design.',
          videoUrl: 'https://example.com/video/dispatch',
        },
      ],
    },
  },

  {
    type: 'contact',
    enabled: true,
    order: 11,
    content: {
      intro:
        'Open to staff-level front-end roles and short platform engagements. Replies within two days.',
      email: {
        label: 'Email',
        value: 'mira@okonkwo.dev',
        href: 'mailto:mira@okonkwo.dev',
        visible: true,
      },
      github: {
        label: 'GitHub',
        value: 'github.com/miraok',
        href: 'https://example.com/github/miraok',
        visible: true,
      },
      linkedin: {
        label: 'LinkedIn',
        value: 'linkedin.com/in/miraokonkwo',
        href: 'https://example.com/in/miraokonkwo',
        visible: true,
      },
      x: {
        label: 'X',
        value: '@miraok',
        href: 'https://example.com/x/miraok',
        visible: true,
      },
      site: {
        label: 'Personal site',
        value: 'okonkwo.dev',
        href: 'https://example.com/okonkwo.dev',
        visible: false,
      },
    },
  },
];

/**
 * The dispatcher's three drop rules, in a form the page can render as cases:
 * a disabled section, an enabled-but-empty one, and a type this build has no
 * component for. None of the three may leave a trace on the page.
 */
export const droppedSections: TypedSectionInstance[] = [
  {
    type: 'projects',
    enabled: false,
    order: 12,
    content: { items: [{ id: 'x', title: 'Never rendered', problem: 'x', impact: 'x' }] },
  },
  {
    type: 'blog',
    enabled: true,
    order: 13,
    content: { items: [] },
  },
  {
    type: 'gallery',
    enabled: true,
    order: 14,
    content: { items: [{ id: 'g', caption: 'No image, no video.' }] },
  },
];

/** Hero alone — the "nothing else renders" check (FR-CFG-2). */
export const heroOnlySections: TypedSectionInstance[] = [
  fixtureSections[0],
  ...droppedSections,
];
