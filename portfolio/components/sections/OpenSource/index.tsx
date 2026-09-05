import {
  REGISTRY,
  type OpenSourceContent,
  type OpenSourceContribution,
} from '@openportfolio/registry';
import {
  Card,
  Heading,
  Link,
  SectionShell,
  Stack,
  Text,
} from '@/components/ui';
import { fieldRuns, renderRuns, type RunWrappers } from '../fields';

/**
 * Open source (business req 9, FR-SEC-OSS-1).
 *
 * The statistics are GitHub-backed, which means they come from the integration
 * cache and may be stale — the page renders them identically either way and
 * makes no external call (FR-INT-1, FR-INT-3). Where a figure is missing it is
 * simply not drawn; a stale or failed sync never produces a zero.
 */
const STAT_LABELS: readonly [key: 'repos' | 'stars' | 'contributions', label: string][] =
  [
    ['repos', 'Repositories'],
    ['stars', 'Stars'],
    ['contributions', 'Contributions'],
  ];

const RENDERERS = {
  stats: (content: OpenSourceContent) => {
    const stats = content.stats;
    if (!stats) return null;

    const present = STAT_LABELS.filter(
      ([key]) => typeof stats[key] === 'number',
    );
    if (present.length === 0) return null;

    return (
      <Stack direction="row" wrap gapX="32" gapY="12">
        {present.map(([key, label]) => (
          <Stack key={key} gap="4">
            <Text variant="skill">{stats[key]}</Text>
            <Text variant="label" tone="muted">
              {label}
            </Text>
          </Stack>
        ))}
      </Stack>
    );
  },

  contributions: (content: OpenSourceContent) => {
    const contributions = content.contributions ?? [];
    if (contributions.length === 0) return null;

    return (
      <Stack as="ul" gap="12">
        {contributions.map((item: OpenSourceContribution) => (
          <Card
            as="li"
            key={item.id}
            padding="snug"
            radius="md"
            className="flex flex-col gap-6"
          >
            <Heading level={3} visual="card">
              {item.name}
            </Heading>
            {item.description ? (
              <Text variant="body" tone="muted" balance>
                {item.description}
              </Text>
            ) : null}
            {item.impact ? <Text variant="detail">{item.impact}</Text> : null}
            {item.url ? (
              <Link href={item.url} variant="underline">
                View contribution
              </Link>
            ) : null}
          </Card>
        ))}
      </Stack>
    );
  },

  profileUrl: (content: OpenSourceContent) =>
    content.profileUrl ? (
      <Link href={content.profileUrl} variant="underline">
        GitHub profile
      </Link>
    ) : null,
};

const WRAPPERS: RunWrappers = {
  stats: (nodes) => <Stack gap="0">{nodes}</Stack>,
  links: (nodes) => (
    <Stack direction="row" wrap gapX="18" gapY="6">
      {nodes}
    </Stack>
  ),
};

export function OpenSource({ content }: { content: OpenSourceContent }) {
  const runs = fieldRuns(REGISTRY.opensource.fields, content, RENDERERS);

  return (
    <SectionShell id="opensource" heading={REGISTRY.opensource.label}>
      <Stack gap="stack-lg">{renderRuns(runs, WRAPPERS)}</Stack>
    </SectionShell>
  );
}
