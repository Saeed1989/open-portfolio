// Dev-only token and primitive reference, rendered at ?styleguide.
// Stage 1: tokens and background layers. Primitives are registered here in Stage 2.
import type { ReactNode } from 'react';

const colors = [
  'bg',
  'bg-band',
  'bg-sunken',
  'surface-from',
  'surface-to',
  'raised-from',
  'raised-to',
  'text',
  'text-muted',
  'text-subtle',
  'text-label',
  'text-disabled',
  'accent-from',
  'accent-to',
  'accent-ink',
  'accent-ink-strong',
  'on-accent',
  'success',
  'danger',
  'border-subtle',
  'border',
  'border-strong',
  'highlight-on-accent',
];

const textSizes = [
  'text-display',
  'text-display-sm',
  'text-cta',
  'text-cta-sm',
  'text-heading',
  'text-heading-sm',
  'text-lead',
  'text-body-lg',
  'text-body',
  'text-body-sm',
  'text-caption',
  'text-small',
  'text-eyebrow',
  'text-micro',
];

const radii = ['rounded-xs', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-full'];
const shadows = ['shadow-lift-1', 'shadow-lift-2', 'shadow-glow'];

function tokenValue(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 py-10">
      <h2 className="font-mono text-eyebrow font-medium tracking-eyebrow text-text-label uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Styleguide() {
  return (
    <main className="min-h-screen">
      <div className="field-hero px-6 pt-16 pb-24 md:px-30">
        <p className="font-mono text-eyebrow font-medium tracking-eyebrow text-text-label uppercase">
          Dev only · ?styleguide
        </p>
        <h1 className="mt-3 text-display-sm font-semibold md:text-display">Openfolio styleguide</h1>
        <p className="mt-4 max-w-xl text-lead text-text-muted">
          Tokens from src/styles/globals.css, shown on the hero field — base fill, dot grid, and
          the two blurred accent radials.
        </p>
      </div>

      <div className="px-6 md:px-30">
        <Group title="Colour">
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-3">
            {colors.map((c) => (
              <li
                key={c}
                className="overflow-hidden rounded-lg bg-linear-135 from-surface-from to-surface-to shadow-lift-1"
              >
                <div className="h-16" style={{ background: `var(--color-${c})` }} />
                <div className="flex flex-col gap-1 p-3">
                  <span className="font-mono text-small text-text">--color-{c}</span>
                  <span className="font-mono text-micro text-text-subtle">
                    {tokenValue(`--color-${c}`)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Group>

        <Group title="Accent fill · 135deg, light source top-left">
          <div className="h-16 max-w-md rounded-lg bg-linear-135 from-accent-from to-accent-to shadow-glow" />
        </Group>

        <Group title="Surfaces">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-linear-135 from-surface-from to-surface-to p-6 shadow-lift-1">
              <span className="font-mono text-small">surface · shadow-lift-1</span>
            </div>
            <div className="rounded-xl bg-linear-135 from-raised-from to-raised-to p-6 shadow-lift-2">
              <span className="font-mono text-small">raised · shadow-lift-2</span>
            </div>
          </div>
        </Group>

        <Group title="Shadow">
          <div className="flex flex-wrap gap-8">
            {shadows.map((s) => (
              <div
                key={s}
                className={`flex h-24 w-48 items-end rounded-xl bg-bg-sunken p-3 ${s}`}
              >
                <span className="font-mono text-small text-text-subtle">{s}</span>
              </div>
            ))}
          </div>
        </Group>

        <Group title="Radius">
          <div className="flex flex-wrap gap-6">
            {radii.map((r) => (
              <div key={r} className="flex flex-col items-center gap-2">
                <div className={`size-16 bg-raised-from shadow-lift-1 ${r}`} />
                <span className="font-mono text-small text-text-subtle">{r}</span>
              </div>
            ))}
          </div>
        </Group>

        <Group title="Type · Archivo / IBM Plex Mono">
          <ul className="flex flex-col gap-4">
            {textSizes.map((t) => (
              <li key={t} className="flex flex-col gap-1">
                <span className="font-mono text-micro text-text-label">{t}</span>
                <span className={`${t} font-semibold`}>Show the work, not the resume.</span>
              </li>
            ))}
            <li className="flex flex-col gap-1">
              <span className="font-mono text-micro text-text-label">font-mono</span>
              <span className="font-mono text-body-lg">your-name.openfolio.com</span>
            </li>
          </ul>
        </Group>

        <Group title="Ink on band">
          <div className="flex flex-col gap-2 rounded-xl bg-bg-band p-6">
            <span className="text-body text-text">text — primary</span>
            <span className="text-body text-text-muted">text-muted — secondary</span>
            <span className="text-body text-text-subtle">text-subtle — tertiary</span>
            <span className="text-body text-text-label">text-label — labels</span>
            <span className="text-body text-text-disabled">text-disabled</span>
            <span className="text-body text-accent-ink">accent-ink</span>
            <span className="text-body text-success">success</span>
            <span className="text-body text-danger">danger</span>
          </div>
        </Group>
      </div>

      <div className="field-cta mt-10 px-6 py-24 md:px-30">
        <p className="text-cta-sm font-semibold md:text-cta">CTA field</p>
        <p className="mt-3 text-body text-text-muted">Band fill with the two blurred radials.</p>
      </div>
    </main>
  );
}
