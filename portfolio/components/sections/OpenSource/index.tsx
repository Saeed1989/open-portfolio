import {
  REGISTRY,
  type GitHubEmbedCard,
  type OpenSourceContent,
  type OpenSourceContribution,
} from '@portfolio/registry';
import {
  Card,
  DescriptionList,
  DescriptionListItem,
  Heading,
  Link,
  SectionShell,
  Stack,
  Text,
} from '@/components/ui';
import { GitHubEmbed } from '@/components/GitHubEmbed';
import type { PortfolioTheme } from '@/lib/theme';
import { fieldRuns, renderRuns, type RunWrappers } from '../fields';

/**
 * Open source (business req 9, FR-SEC-OSS-1).
 *
 * Two sources of statistics, and they behave differently on purpose.
 *
 * The manual figures are ours: typed by the tenant, rendered as a real
 * description list, readable by a screen reader, present in the initial HTML
 * (FR-PUB-4). Where a figure is missing it is simply not drawn; nothing here
 * ever produces a zero.
 *
 * The embedded cards are not ours. They are `<img>` elements pointed at a
 * third-party service, requested by the visitor's browser and never by this
 * system — no fetch at render, no cache, no credential (FR-INT-1,
 * NFR-PERF-3). Their numbers live inside an opaque image we cannot read, so
 * where the manual figures are present the cards are marked decorative and the
 * text carries the meaning; see GitHubEmbed for the whole of that argument.
 */
const STAT_LABELS: readonly [
  key: 'repos' | 'commitsLastYear' | 'pullRequests' | 'contributions',
  label: string,
][] = [
  ['repos', 'Repositories'],
  ['commitsLastYear', 'Commits (last year)'],
  ['pullRequests', 'Pull requests'],
  ['contributions', 'Contributions'],
];

/** The figures the tenant typed, if any. Drives the cards' alt text. */
function presentStats(content: OpenSourceContent) {
  const stats = content.stats;
  if (!stats) return [];
  return STAT_LABELS.filter(([key]) => typeof stats[key] === 'number');
}

/** The descriptor's default when the tenant has not chosen (FR-REG-1). */
const DEFAULT_CARDS = REGISTRY.opensource.fields.find(
  (field) => field.key === 'embedCards',
)?.defaultValue as readonly GitHubEmbedCard[] | undefined;

interface OpenSourceProps {
  content: OpenSourceContent;
  theme?: PortfolioTheme;
}

function renderers(theme: PortfolioTheme | undefined) {
  return {
    stats: (content: OpenSourceContent) => {
      const stats = content.stats;
      const present = presentStats(content);
      if (!stats || present.length === 0) return null;

      return (
        <DescriptionList layout="row">
          {present.map(([key, label]) => (
            <DescriptionListItem
              key={key}
              label={label}
              layout="row"
              valueStyle="figure"
              emphasis
            >
              {stats[key]}
            </DescriptionListItem>
          ))}
        </DescriptionList>
      );
    },

    /*
     * `githubUsername` is declared in the registry but has no renderer of its
     * own — it is the input to this one, not a visible field. A field with no
     * renderer is skipped by the walk, so declaring it costs no markup.
     */
    embedCards: (content: OpenSourceContent) => {
      const username = content.githubUsername?.trim();
      if (!username) return null;

      const cards = content.embedCards ?? DEFAULT_CARDS ?? [];
      if (cards.length === 0) return null;

      return (
        <GitHubEmbed
          username={username}
          cards={cards}
          accent={theme?.accent}
          decorative={presentStats(content).length > 0}
        />
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
}

const WRAPPERS: RunWrappers = {
  stats: (nodes) => <Stack gap="0">{nodes}</Stack>,
  github: (nodes) => <Stack gap="0">{nodes}</Stack>,
  links: (nodes) => (
    <Stack direction="row" wrap gapX="18" gapY="6">
      {nodes}
    </Stack>
  ),
};

export function OpenSource({ content, theme }: OpenSourceProps) {
  const runs = fieldRuns(
    REGISTRY.opensource.fields,
    content,
    renderers(theme),
  );

  return (
    <SectionShell id="opensource" heading={REGISTRY.opensource.label}>
      <Stack gap="stack-lg">{renderRuns(runs, WRAPPERS)}</Stack>
    </SectionShell>
  );
}
