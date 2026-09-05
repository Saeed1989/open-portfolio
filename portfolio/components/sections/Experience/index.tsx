import {
  REGISTRY,
  type ExperienceContent,
  type ExperienceItem,
} from '@openportfolio/registry';
import {
  Card,
  Disclosure,
  Heading,
  SectionShell,
  Stack,
  Text,
} from '@/components/ui';
import { fieldRuns, renderRuns, type RunWrappers } from '../fields';

/**
 * Experience (business req 5, FR-SEC-EXP-1).
 *
 * Each entry is individually collapsible. The disclosure is native
 * `<details>`, so the detail is in the initial HTML for crawlers and operable
 * from the keyboard without a line of JavaScript.
 *
 * Order is the tenant's — no sort is applied here.
 */
const RENDERERS = {
  title: (item: ExperienceItem) =>
    item.title ? (
      <Heading level={3} visual="card">
        {item.title}
      </Heading>
    ) : null,

  company: (item: ExperienceItem) =>
    item.company ? (
      <Text variant="detail" tone="muted">
        {item.company}
      </Text>
    ) : null,

  startDate: (item: ExperienceItem) =>
    item.startDate ? (
      <Text variant="meta" tone="muted">
        {item.startDate}
      </Text>
    ) : null,

  /* An absent end date is a current role, not a missing value. */
  endDate: (item: ExperienceItem) =>
    item.startDate ? (
      <Text variant="meta" tone="muted">
        – {item.endDate ?? 'Present'}
      </Text>
    ) : null,

  description: (item: ExperienceItem) =>
    item.description ? (
      <Text variant="body" tone="muted" balance>
        {item.description}
      </Text>
    ) : null,

  accomplishments: (item: ExperienceItem) =>
    item.accomplishments && item.accomplishments.length > 0 ? (
      <Stack as="ul" gap="8">
        {item.accomplishments.map((line) => (
          <Stack as="li" key={line} gap="0">
            <Text variant="detail" tone="muted">
              {line}
            </Text>
          </Stack>
        ))}
      </Stack>
    ) : null,
};

const WRAPPERS: RunWrappers = {
  headline: (nodes) => (
    <Stack gap="4" className="min-w-0">
      {nodes}
    </Stack>
  ),
  dates: (nodes) => (
    <Stack direction="row" wrap align="baseline" gapX="6" gapY="2">
      {nodes}
    </Stack>
  ),
  detail: (nodes) => <Disclosure summary="Accomplishments">{nodes}</Disclosure>,
};

function ExperienceEntry({ item }: { item: ExperienceItem }) {
  const runs = fieldRuns(REGISTRY.experience.itemFields, item, RENDERERS);

  return (
    <Card as="li" padding="roomy" radius="lg" className="flex flex-col gap-12">
      {renderRuns(runs, WRAPPERS)}
    </Card>
  );
}

export function Experience({ content }: { content: ExperienceContent }) {
  const items = content.items ?? [];

  return (
    <SectionShell id="experience" heading={REGISTRY.experience.label}>
      <Stack as="ul" gap="grid-gap">
        {items.map((item) => (
          <ExperienceEntry key={item.id} item={item} />
        ))}
      </Stack>
    </SectionShell>
  );
}
