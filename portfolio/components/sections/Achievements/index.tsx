import {
  REGISTRY,
  type AchievementItem,
  type AchievementsContent,
} from '@openportfolio/registry';
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

/**
 * Achievements (business req 11, FR-SEC-ACH-1).
 *
 * `type` is an enum in the registry, so the four values are fixed and their
 * display form is derived rather than stored — a tenant cannot invent a fifth
 * kind by typing one.
 */
const TYPE_LABELS: Record<AchievementItem['type'], string> = {
  certification: 'Certification',
  award: 'Award',
  ranking: 'Ranking',
  hackathon: 'Hackathon',
};

const RENDERERS = {
  type: (item: AchievementItem) =>
    item.type && TYPE_LABELS[item.type] ? (
      <Badge variant="accent">{TYPE_LABELS[item.type]}</Badge>
    ) : null,

  date: (item: AchievementItem) =>
    item.date ? (
      <Text variant="meta" tone="muted">
        {item.date}
      </Text>
    ) : null,

  title: (item: AchievementItem) =>
    item.title ? (
      <Heading level={3} visual="card">
        {item.title}
      </Heading>
    ) : null,

  issuer: (item: AchievementItem) =>
    item.issuer ? (
      <Text variant="detail" tone="muted">
        {item.issuer}
      </Text>
    ) : null,

  url: (item: AchievementItem) =>
    item.url ? (
      <Link href={item.url} variant="underline">
        Details
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

function Achievement({ item }: { item: AchievementItem }) {
  const runs = fieldRuns(REGISTRY.achievements.itemFields, item, RENDERERS);

  return (
    <Card as="li" padding="roomy" radius="lg" className="flex flex-col gap-10">
      {renderRuns(runs, WRAPPERS)}
    </Card>
  );
}

export function Achievements({ content }: { content: AchievementsContent }) {
  const items = content.items ?? [];

  return (
    <SectionShell id="achievements" heading={REGISTRY.achievements.label}>
      <Grid as="ul" tracks="cards" gap="grid-gap">
        {items.map((item) => (
          <Achievement key={item.id} item={item} />
        ))}
      </Grid>
    </SectionShell>
  );
}
