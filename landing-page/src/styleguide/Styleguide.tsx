// Dev-only token and primitive reference, rendered at ?styleguide.
// Strings here are styleguide labels, not page copy.
import { useState, type ReactNode } from 'react';
import { Badge } from '../components/ui/Badge';
import { BrowserFrame } from '../components/ui/BrowserFrame';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Icon } from '../components/ui/Icon';
import { Input } from '../components/ui/Input';
import { Link } from '../components/ui/Link';
import { SectionShell } from '../components/ui/SectionShell';
import { SlugInput, type SlugState } from '../components/ui/SlugInput';
import { Text, type TextSize, type TextTone } from '../components/ui/Text';
import { normalizeSlug, SLUG_MAX_LENGTH, validateSlug } from '../lib/slug';

const colors = [
  'bg',
  'bg-band',
  'bg-sunken',
  'surface-from',
  'surface-to',
  'raised-from',
  'raised-to',
  'raised-hover-from',
  'raised-hover-to',
  'raised-pressed-from',
  'raised-pressed-to',
  'selected-from',
  'selected-to',
  'text',
  'text-muted',
  'text-subtle',
  'text-label',
  'text-disabled',
  'accent-from',
  'accent-to',
  'accent-from-hover',
  'accent-to-hover',
  'accent-ink',
  'accent-ink-strong',
  'on-accent',
  'success',
  'danger',
  'border-subtle',
  'border',
  'border-strong',
  'highlight-on-accent',
  'light-bg',
  'light-chrome',
  'light-text-muted',
];

const radii = ['rounded-xs', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-full'];
const shadows = [
  'shadow-lift-1',
  'shadow-lift-2',
  'shadow-glow',
  'shadow-glow-hover',
  'shadow-glow-pressed',
  'shadow-control',
  'shadow-control-hover',
];
const textSizes: TextSize[] = ['lead', 'body-lg', 'body', 'body-sm', 'caption', 'small', 'micro', 'eyebrow'];
const textTones: TextTone[] = ['default', 'muted', 'subtle', 'label', 'accent', 'accent-strong', 'success', 'danger'];

const slugStates: { state: SlugState; value: string; message: string }[] = [
  { state: 'idle', value: '', message: 'Lowercase letters, numbers and hyphens.' },
  { state: 'invalid', value: 'al', message: 'At least 3 characters.' },
  { state: 'checking', value: 'alice', message: 'Checking availability…' },
  { state: 'available', value: 'alice-nakamura', message: 'Available.' },
  { state: 'taken', value: 'alice', message: 'Taken.' },
  { state: 'reserved', value: 'admin', message: 'Reserved.' },
];

const formatMessages = {
  'invalid-characters': 'Lowercase letters, numbers and hyphens only.',
  'too-short': 'At least 3 characters.',
  'too-long': 'At most 39 characters.',
  'edge-hyphen': 'Cannot start or end with a hyphen.',
} as const;

function tokenValue(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border-subtle py-10">
      <h2 className="font-mono text-eyebrow font-medium tracking-eyebrow text-text-label uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-4">{children}</div>;
}

function LiveSlugInput() {
  const [value, setValue] = useState('');
  const error = value === '' ? null : validateSlug(value);
  const state: SlugState = value === '' ? 'idle' : error ? 'invalid' : 'idle';
  const message =
    value === ''
      ? 'Lowercase letters, numbers and hyphens.'
      : error
        ? formatMessages[error]
        : 'Looks good.';

  return (
    <SlugInput
      label="Your address"
      suffix=".openfolio.com"
      placeholder="your-name"
      value={value}
      onChange={(raw) => setValue(normalizeSlug(raw))}
      maxLength={SLUG_MAX_LENGTH}
      state={state}
      message={message}
      className="max-w-lg"
    />
  );
}

export function Styleguide() {
  return (
    <main className="min-h-screen">
      <SectionShell tone="hero" className="pt-16 pb-24">
        <Text size="eyebrow">Dev only · ?styleguide</Text>
        <Heading level={1} size="display" accent="every variant." className="mt-3">
          Every primitive,
        </Heading>
        <Text size="lead" tone="muted" className="mt-4 max-w-xl">
          Rendered on the real background layers. Hover, press and Tab through the interactive
          ones to see their states.
        </Text>
      </SectionShell>

      <div className="mx-auto max-w-300 px-5 md:px-10">
        <Group title="Button · primary">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Row key={size}>
              <Button size={size}>Claim</Button>
              <Button size={size} disabled>
                Claim
              </Button>
              <Text size="small" tone="subtle" mono>
                size {size} · rest / disabled
              </Text>
            </Row>
          ))}
        </Group>

        <Group title="Button · secondary">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Row key={size}>
              <Button variant="secondary" size={size}>
                Continue with Google
              </Button>
              <Button variant="secondary" size={size} disabled>
                Continue with Google
              </Button>
              <Text size="small" tone="subtle" mono>
                size {size} · rest / disabled
              </Text>
            </Row>
          ))}
        </Group>

        <Group title="SlugInput · states">
          <div className="grid gap-6 md:grid-cols-2">
            {slugStates.map(({ state, value, message }) => (
              <div key={state} className="flex flex-col gap-2">
                <Text size="small" tone="subtle" mono>
                  state={state}
                </Text>
                <SlugInput
                  label="Your address"
                  suffix=".openfolio.com"
                  placeholder="your-name"
                  value={value}
                  onChange={() => undefined}
                  state={state}
                  message={message}
                />
              </div>
            ))}
          </div>
          <Text size="small" tone="subtle" mono>
            live · lib/slug.ts normalises and validates format
          </Text>
          <LiveSlugInput />
          <Text size="small" tone="subtle" mono>
            size md
          </Text>
          <SlugInput
            label="Your address"
            suffix=".openfolio.com"
            placeholder="your-name"
            value=""
            onChange={() => undefined}
            state="idle"
            message="Lowercase letters, numbers and hyphens."
            size="md"
            className="max-w-md"
          />
        </Group>

        <Group title="Input · tones">
          <div className="grid gap-4 md:grid-cols-2">
            {(['default', 'accent', 'success', 'danger'] as const).map((tone) => (
              <label key={tone} className="flex flex-col gap-2">
                <Text as="span" size="small" tone="subtle" mono>
                  tone={tone}
                </Text>
                <Input tone={tone} size="md" placeholder="Display name" />
              </label>
            ))}
            <label className="flex flex-col gap-2">
              <Text as="span" size="small" tone="subtle" mono>
                disabled
              </Text>
              <Input size="md" placeholder="Display name" disabled />
            </label>
          </div>
        </Group>

        <Group title="Heading">
          <Heading level={2} size="display">
            display
          </Heading>
          <Heading level={2} size="cta">
            cta · Take the address before someone else does.
          </Heading>
          <Heading level={2} size="heading">
            heading · Pull in what already exists.
          </Heading>
          <Heading level={3} size="title">
            title · GitHub
          </Heading>
        </Group>

        <Group title="Text · sizes">
          {textSizes.map((size) => (
            <Text key={size} size={size}>
              {size} · Show the work, not the resume.
            </Text>
          ))}
          <Text mono>mono · your-name.openfolio.com</Text>
          <Text weight="medium">weight medium</Text>
        </Group>

        <Group title="Text · tones">
          {textTones.map((tone) => (
            <Text key={tone} tone={tone}>
              {tone}
            </Text>
          ))}
        </Group>

        <Group title="Link">
          <Row>
            <Link href="#link">inline</Link>
            <Link href="#link" mono>
              inline mono
            </Link>
            <Link href="#link" variant="nav">
              nav
            </Link>
            <Link href="#link" variant="subtle">
              subtle
            </Link>
          </Row>
        </Group>

        <Group title="Badge">
          <Row>
            <Badge variant="pill" dot>
              Portfolios for software engineers
            </Badge>
            <Badge variant="tag">preset</Badge>
            <Badge variant="chip">TypeScript</Badge>
            <Badge variant="step">1</Badge>
            <Badge variant="mark">GH</Badge>
          </Row>
        </Group>

        <Group title="Icon">
          <Row>
            <Icon name="check" className="text-success" />
            <Icon name="check" size="sm" className="text-success" />
            <Icon name="spinner" />
            <Icon name="spinner" size="sm" />
            <Text size="small" tone="subtle" mono>
              spinner is static under prefers-reduced-motion
            </Text>
          </Row>
        </Group>

        <Group title="Card">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <Text weight="medium">surface · md</Text>
            </Card>
            <Card variant="selected">
              <Text weight="medium">selected · md</Text>
            </Card>
            <Card size="sm">
              <Text weight="medium">surface · sm</Text>
            </Card>
            <Card variant="selected" size="sm">
              <Text weight="medium">selected · sm</Text>
            </Card>
          </div>
        </Group>

        <Group title="BrowserFrame">
          <div className="grid gap-6 md:grid-cols-2">
            <BrowserFrame slug="your-name" host=".openfolio.com" label="Example portfolio">
              <div className="p-6">
                <Text tone="muted">dark · md</Text>
              </div>
            </BrowserFrame>
            <BrowserFrame
              slug="your-name"
              host=".openfolio.com"
              label="Example portfolio, light theme"
              tone="light"
            >
              <div className="h-24" />
            </BrowserFrame>
            <BrowserFrame slug="your-name" host=".openfolio.com" label="Example" size="sm">
              <div className="p-4">
                <Text size="small" tone="muted">
                  dark · sm
                </Text>
              </div>
            </BrowserFrame>
            <BrowserFrame
              slug="your-name"
              host=".openfolio.com"
              label="Example, light"
              tone="light"
              size="sm"
            >
              <div className="h-16" />
            </BrowserFrame>
          </div>
        </Group>
      </div>

      <SectionShell tone="band">
        <Text size="eyebrow">SectionShell · band</Text>
      </SectionShell>
      <SectionShell tone="plain">
        <Text size="eyebrow">SectionShell · plain</Text>
      </SectionShell>
      <SectionShell tone="cta">
        <Heading level={2} size="cta">
          SectionShell · cta
        </Heading>
      </SectionShell>

      <div className="mx-auto max-w-300 px-5 md:px-10">
        <Group title="Tokens · colour">
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

        <Group title="Tokens · shadow">
          <div className="flex flex-wrap gap-8">
            {shadows.map((s) => (
              <div key={s} className={`flex h-24 w-48 items-end rounded-xl bg-bg-sunken p-3 ${s}`}>
                <span className="font-mono text-small text-text-subtle">{s}</span>
              </div>
            ))}
          </div>
        </Group>

        <Group title="Tokens · radius">
          <div className="flex flex-wrap gap-6">
            {radii.map((r) => (
              <div key={r} className="flex flex-col items-center gap-2">
                <div className={`size-16 bg-raised-from shadow-lift-1 ${r}`} />
                <span className="font-mono text-small text-text-subtle">{r}</span>
              </div>
            ))}
          </div>
        </Group>
      </div>
    </main>
  );
}
