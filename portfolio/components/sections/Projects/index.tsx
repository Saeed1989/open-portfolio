import {
  REGISTRY,
  type ProjectItem,
  type ProjectsContent,
} from '@openportfolio/registry';
import {
  Badge,
  Card,
  DescriptionList,
  DescriptionListItem,
  Disclosure,
  Grid,
  Heading,
  Image,
  Link,
  SectionShell,
  Stack,
  Text,
} from '@/components/ui';
import { fieldRuns, renderRuns, type RunWrappers } from '../fields';

/**
 * Selected work (business req 2, FR-SEC-PROJ-*).
 *
 * FR-SEC-PROJ-6 asks for two depths. The design resolves the open question in
 * SRS §10.3.3 in favour of the expandable card: the card is the fifteen-second
 * read, and Solution / My role sit behind a native disclosure rather than on a
 * separate route.
 *
 * The 3–5 cap (FR-SEC-PROJ-2) is enforced by the API, not here — this renders
 * what it is given.
 */
const ITEM_RENDERERS = {
  screenshot: (item: ProjectItem) =>
    item.screenshot ? (
      <Image
        src={item.screenshot.src}
        alt={item.screenshot.alt}
        width={item.screenshot.width}
        height={item.screenshot.height}
        radius="sm"
        className="aspect-shot w-full border border-border"
      />
    ) : null,

  category: (item: ProjectItem) =>
    item.category ? <Badge variant="accent">{item.category}</Badge> : null,

  year: (item: ProjectItem) =>
    item.year ? (
      <Text variant="meta" tone="muted">
        {item.year}
      </Text>
    ) : null,

  title: (item: ProjectItem) =>
    item.title ? (
      <Heading level={3} visual="card">
        {item.title}
      </Heading>
    ) : null,

  problem: (item: ProjectItem) =>
    item.problem ? (
      <DescriptionListItem label="Problem">{item.problem}</DescriptionListItem>
    ) : null,

  /* FR-SEC-PROJ-5: required, and the design gives it the heavier weight. */
  impact: (item: ProjectItem) =>
    item.impact ? (
      <DescriptionListItem label="Impact" emphasis>
        {item.impact}
      </DescriptionListItem>
    ) : null,

  stack: (item: ProjectItem) =>
    item.stack && item.stack.length > 0 ? (
      <DescriptionListItem label="Stack" valueStyle="technical">
        {item.stack.join(' · ')}
      </DescriptionListItem>
    ) : null,

  solution: (item: ProjectItem) =>
    item.solution ? (
      <DescriptionListItem label="Solution" tone="muted">
        {item.solution}
      </DescriptionListItem>
    ) : null,

  role: (item: ProjectItem) =>
    item.role ? (
      <DescriptionListItem label="My role" tone="muted">
        {item.role}
      </DescriptionListItem>
    ) : null,

  demoUrl: (item: ProjectItem) =>
    item.demoUrl ? (
      <Link href={item.demoUrl} variant="underline">
        Live demo
      </Link>
    ) : null,

  repoUrl: (item: ProjectItem) =>
    item.repoUrl ? (
      <Link href={item.repoUrl} variant="underline">
        Source
      </Link>
    ) : null,

  /* FR-SEC-PROJ-4: stands in for the missing repository link. */
  confidential: (item: ProjectItem) =>
    item.confidential ? (
      <Text
        variant="caption"
        tone="muted"
        className="inline-flex min-h-tap items-center"
      >
        Client work — source not public
      </Text>
    ) : null,
};

const ITEM_WRAPPERS: RunWrappers = {
  meta: (nodes) => (
    <Stack direction="row" wrap align="baseline" gapX="10" gapY="6">
      {nodes}
    </Stack>
  ),
  summary: (nodes) => <DescriptionList>{nodes}</DescriptionList>,
  detail: (nodes) => (
    <Disclosure summary="Solution and my role">
      <DescriptionList>{nodes}</DescriptionList>
    </Disclosure>
  ),
  /* `mt-auto` pins the links to the card's floor, so cards of differing text
     length still line their actions up across a row. */
  links: (nodes) => (
    <Stack direction="row" wrap gapX="18" gapY="6" className="mt-auto pt-4">
      {nodes}
    </Stack>
  ),
};

function ProjectCard({ item }: { item: ProjectItem }) {
  const runs = fieldRuns(REGISTRY.projects.itemFields, item, ITEM_RENDERERS);

  return (
    <Card as="li" padding="roomy" radius="lg" className="flex flex-col gap-14">
      {renderRuns(runs, ITEM_WRAPPERS)}
    </Card>
  );
}

export function Projects({ content }: { content: ProjectsContent }) {
  const items = content.items ?? [];

  return (
    <SectionShell
      id="projects"
      heading={REGISTRY.projects.label}
      aside={
        <Text variant="caption" tone="muted">
          {items.length} {items.length === 1 ? 'project' : 'projects'}
        </Text>
      }
    >
      <Grid as="ul" tracks="cards" gap="grid-gap">
        {items.map((item) => (
          <ProjectCard key={item.id} item={item} />
        ))}
      </Grid>
    </SectionShell>
  );
}
