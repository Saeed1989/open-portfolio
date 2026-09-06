import type { ReactNode } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DescriptionList,
  DescriptionListItem,
  Disclosure,
  Divider,
  Grid,
  Heading,
  Icon,
  Image,
  Link,
  PageSection,
  ProgressBar,
  RichText,
  SectionShell,
  Stack,
  Tag,
  TagList,
  TagListItem,
  Text,
} from '@/components/ui';
import { DialogDemo } from './DialogDemo';

/**
 * Every primitive, in every variant. A development aid — excluded from the
 * sitemap and disallowed in robots.txt.
 *
 * The whole gallery is a server component. Only the page-level theme toggle is
 * a client component, which is the point: nothing here needs JavaScript to
 * render or to be themed.
 */

const SAMPLE_IMAGE = '/styleguide-sample.svg';

function Spec({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-10 min-w-0">
      <Text variant="mono" tone="muted" as="p">
        {label}
      </Text>
      <div className="flex flex-wrap items-center gap-16 min-w-0">
        {children}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-20 min-w-0">
      <Heading level={3} visual="card">
        {title}
      </Heading>
      <div className="flex flex-col gap-24 min-w-0">{children}</div>
      <Divider />
    </section>
  );
}

export function Gallery() {
  return (
    <div className="flex flex-col gap-32 min-w-0">
      <Group title="Text">
        <Spec label="variant: display | heading | subheading">
          <div className="flex flex-col gap-8 min-w-0">
            <Text variant="display">Display</Text>
            <Text variant="heading">Heading</Text>
            <Text variant="subheading">Subheading</Text>
          </div>
        </Spec>
        <Spec label="variant: body | caption | mono">
          <div className="flex flex-col gap-8 min-w-0">
            <Text variant="body">Body — the default paragraph treatment.</Text>
            <Text variant="caption">Caption — secondary supporting copy.</Text>
            <Text variant="mono">Mono — 0123456789 · not used in the design</Text>
          </div>
        </Spec>
        <Spec label="variant: tagline | lead | detail">
          <div className="flex flex-col gap-8 min-w-0">
            <Text variant="tagline">Tagline — the promise under the name.</Text>
            <Text variant="lead">Lead — the hero bio, at the fluid body size.</Text>
            <Text variant="detail">Detail — a skill name in the detailed tier.</Text>
          </div>
        </Spec>
        <Spec label="variant: eyebrow | label | meta | skill | fine">
          <div className="flex flex-col gap-8 min-w-0">
            <Text variant="eyebrow" tone="accent">
              Eyebrow — above the name
            </Text>
            <Text variant="label" tone="muted">
              Label — a contact row
            </Text>
            <Text variant="meta" tone="muted">
              Meta — 2025
            </Text>
            <Text variant="skill">Skill — TypeScript</Text>
            <Text variant="fine" tone="muted">
              Fine — 9/10
            </Text>
          </div>
        </Spec>
        <Spec label="tone: default | muted | accent">
          <Text variant="body" tone="default">
            Default
          </Text>
          <Text variant="body" tone="muted">
            Muted
          </Text>
          <Text variant="body" tone="accent">
            Accent
          </Text>
        </Spec>
        <Spec label="tone: on-accent (shown on an accent fill)">
          <span className="inline-flex rounded-sm bg-accent px-16 py-10">
            <Text variant="body" tone="on-accent">
              On accent
            </Text>
          </span>
        </Spec>
        <Spec label="balance: constrains the measure">
          <Text variant="body" tone="muted" balance className="max-w-content">
            Eight years across checkout, dispatch and internal tooling. I work
            close to the render path — measuring before rewriting, and shipping
            the smallest change that moves the number.
          </Text>
        </Spec>
      </Group>

      <Group title="Heading">
        <Spec label="visual: display | heading | subheading | card | group">
          <div className="flex flex-col gap-8 min-w-0">
            <Heading level={2} visual="display">
              Display
            </Heading>
            <Heading level={2} visual="heading">
              Heading
            </Heading>
            <Heading level={2} visual="subheading">
              Subheading
            </Heading>
            <Heading level={2} visual="card">
              Card title
            </Heading>
            <Heading level={2} visual="group">
              Group — a skill category
            </Heading>
          </div>
        </Spec>
        <Spec label="level 1–6, each at its default visual">
          <div className="flex flex-col gap-8 min-w-0">
            <Heading level={1}>h1 — default display</Heading>
            <Heading level={2}>h2 — default heading</Heading>
            <Heading level={3}>h3 — default card</Heading>
            <Heading level={4}>h4</Heading>
            <Heading level={5}>h5</Heading>
            <Heading level={6}>h6</Heading>
          </div>
        </Spec>
      </Group>

      <Group title="Link">
        <Spec label="variant: default | quiet">
          <Link href="/styleguide">Default link</Link>
          <Link href="/styleguide" variant="quiet">
            Quiet link
          </Link>
        </Spec>
        <Spec label="variant: nav — default and current">
          <Link href="/styleguide" variant="nav">
            Work
          </Link>
          <Link href="/styleguide" variant="nav" current>
            Skills (current)
          </Link>
        </Spec>
        <Spec label="variant: underline">
          <Link href="/styleguide" variant="underline">
            Live demo
          </Link>
          <Link href="https://example.com" variant="underline">
            External (gets rel=noopener)
          </Link>
        </Spec>
      </Group>

      <Group title="Button">
        <Spec label="variant: primary | secondary — size md">
          <Button variant="primary">Download résumé</Button>
          <Button variant="secondary">Schedule a chat</Button>
        </Spec>
        <Spec label="variant: primary | secondary — size sm">
          <Button variant="primary" size="sm">
            Primary small
          </Button>
          <Button variant="secondary" size="sm">
            Secondary small
          </Button>
        </Spec>
        <Spec label="href renders an anchor; download prompts a save">
          <Button href="/styleguide">Anchor button</Button>
          <Button href={SAMPLE_IMAGE} download variant="secondary">
            Download
          </Button>
        </Spec>
        <Spec label="disabled (button element only)">
          <Button disabled>Disabled</Button>
        </Spec>
      </Group>

      <Group title="Tag and TagList">
        <Spec label="variant: neutral | selected — static">
          <Tag>Neutral</Tag>
          <Tag variant="selected" current>
            Selected
          </Tag>
        </Spec>
        <Spec label="as an anchor (category filter)">
          <TagList label="Filter projects by category">
            <TagListItem>
              <Tag href="/styleguide" variant="selected" current>
                All
              </Tag>
            </TagListItem>
            <TagListItem>
              <Tag href="/styleguide">Frontend</Tag>
            </TagListItem>
            <TagListItem>
              <Tag href="/styleguide">Backend</Tag>
            </TagListItem>
            <TagListItem>
              <Tag href="/styleguide">DevOps</Tag>
            </TagListItem>
          </TagList>
        </Spec>
      </Group>

      <Group title="Badge">
        <Spec label="variant: accent | muted — shape pill">
          <Badge variant="accent">Frontend</Badge>
          <Badge variant="muted">Archived</Badge>
        </Spec>
        <Spec label="shape: bare — the card field label">
          <Badge variant="muted" shape="bare">
            Problem
          </Badge>
          <Badge variant="accent" shape="bare">
            Impact
          </Badge>
        </Spec>
      </Group>

      <Group title="Avatar">
        <Spec label="no src — the design's bordered placeholder">
          <Avatar />
        </Spec>
        <Spec label="with src, and size: fixed">
          <Avatar src={SAMPLE_IMAGE} alt="Sample portrait" />
          <Avatar src={SAMPLE_IMAGE} alt="Sample portrait" size="fixed" />
        </Spec>
      </Group>

      <Group title="Image">
        <Spec label="alt, width and height are required by the type">
          <Image
            src={SAMPLE_IMAGE}
            alt="A sample landscape used to demonstrate the Image primitive"
            width={320}
            height={200}
            radius="sm"
          />
        </Spec>
        <Spec label="radius: sm | md | lg | full · fit: contain">
          <Image
            src={SAMPLE_IMAGE}
            alt=""
            width={120}
            height={75}
            radius="md"
          />
          <Image
            src={SAMPLE_IMAGE}
            alt=""
            width={120}
            height={75}
            radius="lg"
          />
          <Image
            src={SAMPLE_IMAGE}
            alt=""
            width={120}
            height={75}
            fit="contain"
            radius="full"
          />
        </Spec>
        <Spec label="priority — eager, above the fold (default is lazy)">
          <Image
            src={SAMPLE_IMAGE}
            alt=""
            width={120}
            height={75}
            priority
            radius="sm"
          />
        </Spec>
      </Group>

      <Group title="Card">
        <Spec label="padding: roomy | snug | none · radius: lg | md | sm">
          <Card padding="roomy" radius="lg" className="max-w-content">
            <Text variant="caption" tone="muted">
              roomy · lg — the project card
            </Text>
          </Card>
          <Card padding="snug" radius="md">
            <Text variant="caption" tone="muted">
              snug · md — the skill card
            </Text>
          </Card>
          <Card padding="none" radius="sm">
            <Text variant="caption" tone="muted" className="block p-12">
              none · sm
            </Text>
          </Card>
        </Spec>
      </Group>

      <Group title="ProgressBar">
        <Spec label="size: lg — the prominent skill tier">
          <div className="flex w-full flex-col gap-12 min-w-0">
            <div className="flex flex-col gap-12">
              <div className="flex flex-wrap items-baseline justify-between gap-x-12 gap-y-4">
                <Text variant="caption">TypeScript</Text>
                <Text variant="caption" tone="muted">
                  9/10
                </Text>
              </div>
              <ProgressBar
                value={9}
                label="TypeScript"
                valueText="9 out of 10"
              />
            </div>
            <ProgressBar value={0} label="Empty example" valueText="0 out of 10" />
            <ProgressBar
              value={10}
              label="Full example"
              valueText="10 out of 10"
            />
          </div>
        </Spec>
        <Spec label="size: sm — the detailed tier">
          <div className="flex w-full flex-col gap-12 min-w-0">
            <ProgressBar
              value={6}
              size="sm"
              label="Edge runtimes"
              valueText="6 out of 10"
            />
            <ProgressBar
              value={8}
              size="sm"
              label="Node.js"
              valueText="8 out of 10"
            />
          </div>
        </Spec>
      </Group>

      <Group title="Icon">
        <Spec label="size: sm | md | lg — labelled and decorative">
          <Icon label="External link" size="sm">
            <path d="M7 17 17 7M9 7h8v8" />
          </Icon>
          <Icon label="External link" size="md">
            <path d="M7 17 17 7M9 7h8v8" />
          </Icon>
          <Icon size="lg">
            <path d="M7 17 17 7M9 7h8v8" />
          </Icon>
        </Spec>
        <Spec label="inherits currentColor from surrounding text">
          <span className="inline-flex items-center gap-8 text-accent-ink">
            <Icon size="md">
              <path d="M7 17 17 7M9 7h8v8" />
            </Icon>
            <Text variant="caption" tone="accent">
              Beside accent text
            </Text>
          </span>
        </Spec>
      </Group>

      <Group title="Divider">
        <Spec label="decorative (default) and semantic">
          <div className="flex w-full flex-col gap-16">
            <Divider />
            <Divider decorative={false} />
          </div>
        </Spec>
      </Group>

      <Group title="Stack">
        <Spec label="direction: column | row (gap from the spacing tokens)">
          <Stack gap="8">
            <Text variant="caption">column</Text>
            <Stack direction="row" wrap gap="8">
              <Badge variant="muted">one</Badge>
              <Badge variant="muted">two</Badge>
              <Badge variant="muted">three</Badge>
            </Stack>
          </Stack>
        </Spec>
        <Spec label="gapX / gapY, wrap, align: baseline, justify: between">
          <Stack
            direction="row"
            wrap
            align="baseline"
            justify="between"
            gapX="24"
            gapY="8"
            className="w-full"
          >
            <Text variant="skill">Name</Text>
            <Text variant="fine" tone="muted">
              9/10
            </Text>
          </Stack>
        </Spec>
        <Spec label="as: ul — bullets and padding already removed">
          <Stack as="ul" gap="8">
            <Stack as="li" gap="0">
              <Text variant="detail">First</Text>
            </Stack>
            <Stack as="li" gap="0">
              <Text variant="detail">Second</Text>
            </Stack>
          </Stack>
        </Spec>
      </Group>

      <Group title="Grid">
        <Spec label="tracks: cards | skills | groups | pairs — auto-fit, no breakpoint">
          <Grid tracks="pairs" gap="grid-gap" className="w-full">
            <Card padding="snug" radius="md">
              <Text variant="detail">Column one</Text>
            </Card>
            <Card padding="snug" radius="md">
              <Text variant="detail">Column two</Text>
            </Card>
            <Card padding="snug" radius="md">
              <Text variant="detail">Column three</Text>
            </Card>
          </Grid>
        </Spec>
      </Group>

      <Group title="DescriptionList">
        <Spec label="layout: stack (label above value), emphasis, valueStyle: technical">
          <DescriptionList className="w-full">
            <DescriptionListItem label="Problem">
              A five-step checkout lost buyers at every hop.
            </DescriptionListItem>
            <DescriptionListItem label="Impact" emphasis>
              Completion up 14 points; median load 2.4s to 880ms.
            </DescriptionListItem>
            <DescriptionListItem label="Stack" valueStyle="technical">
              Rails · Hotwire · Stripe · Postgres
            </DescriptionListItem>
          </DescriptionList>
        </Spec>
        <Spec label="layout: inline (label and value on one baseline), tone: muted">
          <DescriptionList layout="inline" className="w-full">
            <DescriptionListItem label="GPA" layout="inline">
              First class
            </DescriptionListItem>
            <DescriptionListItem label="Honours" layout="inline" tone="muted">
              Dean&apos;s list, three years
            </DescriptionListItem>
          </DescriptionList>
        </Spec>
      </Group>

      <Group title="Disclosure">
        <Spec label="closed by default · defaultOpen · divided={false}">
          <Stack gap="16" className="w-full">
            <Disclosure summary="Solution and my role">
              <Text variant="detail" tone="muted">
                Native details/summary — keyboard operable, in the initial HTML,
                no JavaScript.
              </Text>
            </Disclosure>
            <Disclosure summary="Accomplishments" defaultOpen>
              <Text variant="detail" tone="muted">
                Open on first paint.
              </Text>
            </Disclosure>
            <Disclosure summary="No rule above" divided={false}>
              <Text variant="detail" tone="muted">
                Undivided.
              </Text>
            </Disclosure>
          </Stack>
        </Spec>
      </Group>

      <Group title="Dialog">
        <Spec label="modal · focus trapped · Escape / backdrop / close button">
          <DialogDemo />
        </Spec>
      </Group>

      <Group title="RichText">
        <Spec label="measure: prose | none — the allowlist, in full">
          <div className="w-full min-w-0">
            <RichText
              html={
                '<p>A paragraph, with <strong>bold</strong>, <em>italic</em> and <u>underline</u>.<br />A line break above this one.</p>' +
                '<ul><li>An unordered item</li><li>Another</li></ul>' +
                '<ol><li>An ordered item</li><li>Another</li></ol>'
              }
            />
          </div>
        </Spec>
      </Group>

      <Group title="PageSection">
        <Spec label="padding: section | hero · divided">
          <div className="flex w-full flex-col min-w-0">
            <PageSection divided={false} className="bg-surface">
              <Text variant="caption" tone="muted">
                padding=&quot;section&quot;, divided={'{false}'} — the frame
                SectionShell is built on.
              </Text>
            </PageSection>
            <PageSection padding="hero">
              <Text variant="caption" tone="muted">
                padding=&quot;hero&quot;, with the rule above.
              </Text>
            </PageSection>
          </div>
        </Spec>
      </Group>

      <Group title="SectionShell">
        <Spec label="heading only · heading + aside · heading + description">
          <div className="flex w-full flex-col min-w-0">
            <SectionShell id="sg-plain" heading="Selected work" divided={false}>
              <Text variant="caption" tone="muted">
                Children slot.
              </Text>
            </SectionShell>
            <SectionShell
              id="sg-aside"
              heading="Selected work"
              aside={
                <Text variant="caption" tone="muted">
                  5 projects
                </Text>
              }
            >
              <Text variant="caption" tone="muted">
                Children slot, with an aside opposite the heading.
              </Text>
            </SectionShell>
            <SectionShell
              id="sg-described"
              heading="Prominent skills"
              description="Rated out of 10: 9–10 I have designed and debugged it in production, 7–8 I work in it daily, 5–6 I am actively learning it."
            >
              <Text variant="caption" tone="muted">
                Children slot, below a description.
              </Text>
            </SectionShell>
          </div>
        </Spec>
      </Group>
    </div>
  );
}
