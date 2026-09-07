import type { Config } from 'tailwindcss';

/**
 * Every scale below resolves to a CSS custom property defined in
 * app/globals.css. There is no literal colour, length or font stack in this
 * file — that is deliberate. Themes are swapped at runtime by writing to those
 * properties, so any value inlined here would be frozen at build time and
 * would not follow the theme.
 *
 * The core scales are REPLACED rather than extended. Tailwind's defaults ship
 * their own hardcoded rem/hex values; leaving them in place would let a
 * component reach for `p-4` or `text-blue-500` and silently escape the token
 * system. If a utility exists here, it is bound to a token.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      accent: 'var(--accent)',
      'accent-ink': 'var(--accent-ink)',
      'accent-on': 'var(--accent-on)',
      bg: 'var(--bg)',
      surface: 'var(--surface)',
      text: 'var(--text)',
      'text-muted': 'var(--text-muted)',
      border: 'var(--border)',
      track: 'var(--track)',
      /* The dimmed page behind the case-study dialog. */
      overlay: 'var(--overlay)',
    },
    fontFamily: {
      sans: 'var(--font-sans)',
      display: 'var(--font-display)',
      mono: 'var(--font-mono)',
    },
    fontSize: {
      eyebrow: 'var(--text-eyebrow)',
      chip: 'var(--text-chip)',
      group: 'var(--text-group)',
      meta: 'var(--text-meta)',
      fine: 'var(--text-fine)',
      compact: 'var(--text-compact)',
      nav: 'var(--text-nav)',
      'body-sm': 'var(--text-body-sm)',
      body: 'var(--text-body)',
      skill: 'var(--text-skill)',
      logo: 'var(--text-logo)',
      'body-fluid': 'var(--text-body-fluid)',
      'card-title': 'var(--text-card-title)',
      tagline: 'var(--text-tagline)',
      subheading: 'var(--text-subheading)',
      heading: 'var(--text-heading)',
      display: 'var(--text-display)',
    },
    fontWeight: {
      regular: 'var(--weight-regular)',
      medium: 'var(--weight-medium)',
      semibold: 'var(--weight-semibold)',
      bold: 'var(--weight-bold)',
    },
    lineHeight: {
      none: 'var(--leading-none)',
      display: 'var(--leading-display)',
      heading: 'var(--leading-heading)',
      title: 'var(--leading-title)',
      snug: 'var(--leading-snug)',
      tagline: 'var(--leading-tagline)',
      tight: 'var(--leading-tight)',
      normal: 'var(--leading-normal)',
      relaxed: 'var(--leading-relaxed)',
      loose: 'var(--leading-loose)',
      body: 'var(--leading-body)',
    },
    letterSpacing: {
      display: 'var(--tracking-display)',
      heading: 'var(--tracking-heading)',
      title: 'var(--tracking-title)',
      tagline: 'var(--tracking-tagline)',
      meta: 'var(--tracking-meta)',
      wide: 'var(--tracking-wide)',
      wider: 'var(--tracking-wider)',
      widest: 'var(--tracking-widest)',
      eyebrow: 'var(--tracking-eyebrow)',
    },
    spacing: {
      0: 'var(--space-0)',
      2: 'var(--space-2)',
      4: 'var(--space-4)',
      5: 'var(--space-5)',
      6: 'var(--space-6)',
      8: 'var(--space-8)',
      9: 'var(--space-9)',
      10: 'var(--space-10)',
      12: 'var(--space-12)',
      14: 'var(--space-14)',
      16: 'var(--space-16)',
      18: 'var(--space-18)',
      20: 'var(--space-20)',
      22: 'var(--space-22)',
      24: 'var(--space-24)',
      28: 'var(--space-28)',
      32: 'var(--space-32)',
      34: 'var(--space-34)',
      40: 'var(--space-40)',
      44: 'var(--space-44)',
      48: 'var(--space-48)',
      64: 'var(--space-64)',
      gutter: 'var(--space-gutter)',
      'section-y': 'var(--space-section-y)',
      'hero-top': 'var(--space-hero-top)',
      'hero-bottom': 'var(--space-hero-bottom)',
      'hero-gap': 'var(--space-hero-gap)',
      'section-gap': 'var(--space-section-gap)',
      'heading-gap': 'var(--space-heading-gap)',
      'desc-gap': 'var(--space-desc-gap)',
      'filter-gap': 'var(--space-filter-gap)',
      'grid-gap': 'var(--space-grid-gap)',
      'card-pad': 'var(--space-card-pad)',
      'skill-gap': 'var(--space-skill-gap)',
      'group-gap': 'var(--space-group-gap)',
      'contact-gap': 'var(--space-contact-gap)',
      'block-gap': 'var(--space-block-gap)',
      'stack-sm': 'var(--space-stack-sm)',
      'stack-md': 'var(--space-stack-md)',
      'stack-lg': 'var(--space-stack-lg)',
      'overlay-pad': 'var(--space-overlay-pad)',
      'dialog-x': 'var(--space-dialog-x)',
      'dialog-y': 'var(--space-dialog-y)',
      'dialog-foot': 'var(--space-dialog-foot)',
      'dialog-gap': 'var(--space-dialog-gap)',
      tap: 'var(--size-tap)',
      'tap-lg': 'var(--size-tap-lg)',
      control: 'var(--size-control)',
      'control-sm': 'var(--size-control-sm)',
      'bar-lg': 'var(--size-bar-lg)',
      'bar-sm': 'var(--size-bar-sm)',
      avatar: 'var(--size-avatar)',
      icon: 'var(--size-icon)',
      'icon-sm': 'var(--size-icon-sm)',
      'icon-lg': 'var(--size-icon-lg)',
      full: '100%',
      auto: 'auto',
    },
    borderRadius: {
      none: 'var(--radius-none)',
      sm: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      xl: 'var(--radius-xl)',
      pill: 'var(--radius-pill)',
      full: 'var(--radius-full)',
    },
    borderWidth: {
      0: 'var(--space-0)',
      DEFAULT: 'var(--border-width)',
      emphasis: 'var(--border-width-emphasis)',
    },
    outlineWidth: {
      ring: 'var(--ring-width)',
    },
    outlineOffset: {
      ring: 'var(--ring-offset)',
    },
    boxShadow: {
      none: 'var(--shadow-none)',
      /* The dialog only. Nothing else in the design leaves the page plane. */
      overlay: 'var(--shadow-overlay)',
    },
    maxWidth: {
      content: 'var(--size-content)',
      tagline: 'var(--measure-tagline)',
      bio: 'var(--measure-bio)',
      legend: 'var(--measure-legend)',
      intro: 'var(--measure-intro)',
      pull: 'var(--measure-pull)',
      prose: 'var(--measure-prose)',
      dialog: 'var(--size-dialog)',
      full: '100%',
    },
    gridTemplateColumns: {
      cards: 'repeat(auto-fit, minmax(min(100%, var(--track-card)), 1fr))',
      skills: 'repeat(auto-fit, minmax(min(100%, var(--track-skill)), 1fr))',
      groups: 'repeat(auto-fit, minmax(min(100%, var(--track-group)), 1fr))',
      pairs: 'repeat(auto-fit, minmax(min(100%, var(--track-pair)), 1fr))',
    },
    extend: {
      aspectRatio: {
        square: '1',
        shot: '16 / 10',
      },
      /* The dialog shrinks to its content, and is capped three ways: by the
         backdrop's padded box (`100%`), by the viewport, and absolutely. */
      maxHeight: {
        dialog: 'min(100%, var(--size-dialog-vh), var(--size-dialog-h))',
      },
      zIndex: {
        overlay: 'var(--z-overlay)',
      },
      flexBasis: {
        /* The hero text column's `flex: 1 1 340px` wrap point. */
        hero: 'var(--track-hero)',
      },
    },
  },
  plugins: [],
};

export default config;
