import {
  REGISTRY,
  type SpeakingContent,
  type SpeakingItem,
} from '@portfolio/registry';
import {
  Badge,
  Card,
  Grid,
  Heading,
  Link,
  SectionShell,
  Stack,
  Text,
} from '@/components/ui';
import { fieldRuns, renderRuns, type RunWrappers } from '../fields';

/** Speaking (business req 10, FR-SEC-SPK-1). */
const RENDERERS = {
  date: (item: SpeakingItem) =>
    item.date ? (
      <Text variant="meta" tone="muted">
        {item.date}
      </Text>
    ) : null,

  event: (item: SpeakingItem) =>
    item.event ? <Badge variant="accent">{item.event}</Badge> : null,

  title: (item: SpeakingItem) =>
    item.title ? (
      <Heading level={3} visual="card">
        {item.title}
      </Heading>
    ) : null,

  url: (item: SpeakingItem) =>
    item.url ? (
      <Link href={item.url} variant="underline">
        Video or slides
      </Link>
    ) : null,
};

const WRAPPERS: RunWrappers = {
  meta: (nodes) => (
    <Stack direction="row" wrap align="baseline" gapX="10" gapY="6">
      {nodes}
    </Stack>
  ),
  links: (nodes) => (
    <Stack direction="row" wrap gapX="18" gapY="6" className="mt-auto pt-4">
      {nodes}
    </Stack>
  ),
};

function Talk({ item }: { item: SpeakingItem }) {
  const runs = fieldRuns(REGISTRY.speaking.itemFields, item, RENDERERS);

  return (
    <Card as="li" padding="roomy" radius="lg" className="flex flex-col gap-12">
      {renderRuns(runs, WRAPPERS)}
    </Card>
  );
}

export function Speaking({ content }: { content: SpeakingContent }) {
  const items = content.items ?? [];

  return (
    <SectionShell id="speaking" heading={REGISTRY.speaking.label}>
      <Grid as="ul" tracks="cards" gap="grid-gap">
        {items.map((item) => (
          <Talk key={item.id} item={item} />
        ))}
      </Grid>
    </SectionShell>
  );
}
