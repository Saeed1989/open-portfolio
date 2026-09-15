// Every string on the page. Section components read from here and take no props.

import type { SlugFormatError } from '../lib/slug';

const claimMessages: Record<SlugFormatError | 'idle' | 'ready', string> = {
  idle: '3–39 lowercase letters, numbers or hyphens.',
  ready: 'Next, sign in with GitHub or Google.',
  'invalid-characters': 'Lowercase letters, numbers and hyphens only.',
  'too-short': 'At least 3 characters.',
  'too-long': 'At most 39 characters.',
  'edge-hyphen': 'Cannot start or end with a hyphen.',
};

export const copy = {
  brand: {
    name: 'openfolio',
    mark: 'O',
  },

  links: {
    // Auth surface (FR-AUTH-1). The slug is carried as a query param; availability
    // is checked there, not here (FR-AUTH-5, §10.3 Q4).
    signIn: 'https://admin.openfolio.com/sign-in',
    slugParam: 'slug',
  },

  domain: {
    suffix: '.openfolio.com',
  },

  nav: {
    label: 'Primary',
    features: { label: 'Features', href: '#what-you-publish' },
    signIn: 'Sign in',
    claim: { label: 'Claim your address', href: '#claim' },
  },

  claim: {
    inputLabel: 'Your address',
    placeholder: 'your-name',
    submit: 'Claim',
    messages: claimMessages,
  },

  hero: {
    eyebrow: 'Portfolios for software engineers',
    title: 'Show the work,',
    titleAccent: 'not the resume.',
    lead: 'Openfolio gives you one well-built page for the things you have actually shipped — the projects, the decisions behind them, and the numbers that followed. Pick your address and start filling it in.',
    finePrint:
      'Free, and that is the whole pricing page. Sign in with GitHub or Google — there is no password to make up.',
    howItWorks: {
      title: 'How it works',
      steps: [
        'Claim an address and sign in.',
        'Pick a starting preset.',
        'Fill in sections in the admin panel.',
        'Publish. Live in under a minute.',
      ],
      note: 'Everything stays private until you press publish.',
    },
  },

  example: {
    eyebrow: 'A published portfolio',
    title: 'Every tenant gets the same layout, well built.',
    aside:
      'Server-rendered, fast, readable on a phone. You change the accent, the theme and the type pairing — not the structure.',
    frameLabel: 'Example of a published portfolio at your-name.openfolio.com',
    slug: 'your-name',
    name: 'Your Name',
    bio: 'Frontend engineer. Design systems and browser performance. Two or three sentences on what you build and how you work.',
    meta: ['City · Time zone', 'you@example.com'],
    projectsLabel: 'Selected projects',
    projects: [
      {
        name: 'Design system consolidation',
        blurb:
          'Moved forty product surfaces onto one component set, with tokens generated from a single source and visual regression on every change.',
        stack: 'TypeScript · React · Style Dictionary',
        impact: '118 → 44 components',
        role: 'Owned the token pipeline',
      },
      {
        name: 'Checkout rewrite',
        blurb:
          'Moved a five-step legacy flow to server components and cut the client bundle to what the interactions actually need.',
        stack: 'Next.js · Server Components · Playwright',
        impact: 'LCP 3.4s → 1.1s',
        role: 'Owned the render path',
      },
      {
        name: 'Open-source CLI',
        blurb:
          'A command-line tool that maps prop drilling and dead exports across a React codebase using the TypeScript compiler API.',
        stack: 'TypeScript compiler API · Node · Vitest',
        impact: 'Runs in 9 internal repos',
        role: 'Sole maintainer',
      },
    ],
    skillsLabel: 'Skills',
    skills: [
      'TypeScript 9/10',
      'React 9/10',
      'Accessibility 9/10',
      'Next.js 8/10',
      'Playwright 8/10',
      'Vite 8/10',
      'Style Dictionary 7/10',
      'OpenTelemetry 6/10',
    ],
    contactLabel: 'Contact',
    contact: 'Open to frontend platform work. Email is the fastest way to reach me.',
  },

  sectionTypes: {
    eyebrow: 'What you publish',
    title: 'Thirteen section types. Four are on from the start.',
    legend: 'Enabled by the software-engineer preset',
    presetTag: 'preset',
    // Registry order (SRS §4.1); the preset enables the first four (FR-REG-6).
    items: [
      { name: 'Hero', desc: 'Name, role, a short intro', preset: true },
      { name: 'Projects', desc: 'Case studies with stack and outcomes', preset: true },
      { name: 'Skills', desc: 'Rated out of 10, grouped by category', preset: true },
      { name: 'Contact', desc: 'Email and profile links', preset: true },
      { name: 'Experience', desc: 'Roles, dates, what you shipped', preset: false },
      { name: 'Education', desc: 'Degrees and coursework', preset: false },
      { name: 'Writing', desc: 'Posts from Medium, Dev.to, Substack or RSS', preset: false },
      { name: 'Testimonials', desc: 'Quotes you paste in yourself', preset: false },
      { name: 'Open source', desc: 'Repos, contributions, commit activity', preset: false },
      { name: 'Talks', desc: 'Conference and meetup sessions', preset: false },
      { name: 'Achievements', desc: 'Awards, certifications and badges', preset: false },
      { name: 'Trainings', desc: 'Courses and workshops', preset: false },
      { name: 'Gallery', desc: 'Screenshots, diagrams and demo video', preset: false },
    ],
    note: 'Turn any of the other nine on whenever you have something to put in it. Empty sections never render.',
  },

  integrations: {
    eyebrow: 'Integrations',
    title: 'Pull in what already exists.',
    intro:
      'GitHub and RSS stay in sync on a schedule; Credly badges are imported once. Every one of these has a manual path, so nothing depends on an integration staying connected.',
    items: [
      {
        mark: 'GH',
        name: 'GitHub',
        desc: 'Syncs repository links and profile statistics into your projects and open-source sections.',
        fallback: 'Or enter repos and numbers by hand.',
      },
      {
        mark: 'CR',
        name: 'Credly',
        desc: 'Imports badges once from a public profile, or one at a time from an embed code. They stay unpublished until you pick them.',
        fallback: 'Or add achievements manually.',
      },
      {
        mark: 'RS',
        name: 'Medium / RSS',
        desc: 'Pulls your ten most recent posts from Medium, Dev.to, Substack or your own feed into your writing section.',
        fallback: 'Or paste post titles and links.',
      },
    ],
  },

  theming: {
    eyebrow: 'Theming',
    title: 'Three dials, and they are the right three.',
    dials: [
      {
        term: 'Accent colour',
        desc: 'One colour. A shade that fails AA contrast on light or dark is refused, and the nearest one that passes is offered.',
      },
      { term: 'Theme', desc: 'Light, dark, or follow the visitor’s system setting.' },
      { term: 'Font pairing', desc: 'Chosen from a curated list.' },
    ],
    note: 'The structure stays the same for everyone. Your choices go live when you publish.',
    lightLabel: 'Light',
    darkLabel: 'Dark',
    preview: {
      frameLabelLight: 'Example portfolio in the light theme',
      frameLabelDark: 'Example portfolio in the dark theme',
      name: 'Your Name',
      role: 'Frontend engineer · design systems, performance',
      projectsLabel: 'Projects',
      projects: [
        { name: 'Design system consolidation', impact: '118 → 44 components' },
        { name: 'Checkout rewrite', impact: 'LCP 3.4s → 1.1s' },
      ],
      cta: 'Get in touch',
    },
  },

  publish: {
    eyebrow: 'Draft → publish',
    title: 'Nothing goes out until you say so.',
    steps: [
      {
        title: 'Edit',
        body: 'Fill sections in the admin panel. Your live page does not move while you work, so half-written drafts stay yours.',
        tag: 'private',
      },
      {
        title: 'Check',
        body: 'Publishing validates every section first and lists every problem at once, field by field.',
        tag: 'all errors at once',
      },
      {
        title: 'Publish',
        body: 'One button. The page at your address updates within 60 seconds.',
        tag: 'live in under a minute',
      },
    ],
  },

  faq: {
    eyebrow: 'Questions',
    title: 'Straight answers.',
    items: [
      {
        question: 'What does it cost?',
        answer:
          'Nothing. There is one free tier and no billing — which is why there is no pricing page on this site.',
      },
      {
        question: 'Can I use my own domain?',
        answer: 'Not in this version. Every portfolio lives at your-name.openfolio.com.',
      },
      {
        question: 'Is there a password?',
        answer: 'No. You sign in with GitHub or Google, and no password is stored.',
      },
      {
        question: 'Do I need to write code?',
        answer:
          'No. Everything is a form in the admin panel. The layout is built and maintained for you, and there is no custom CSS or JavaScript to manage.',
      },
      {
        question: 'What happens to empty sections?',
        answer:
          'They stay off the page. An enabled section with nothing in it renders no heading and no empty state.',
      },
    ],
  },

  cta: {
    title: 'Pick your address and start the page.',
    body: 'Claim it now, fill the page in this week, publish when it reads the way you want.',
  },

  footer: {
    copyright: '© 2026 Openfolio',
  },
} as const;
