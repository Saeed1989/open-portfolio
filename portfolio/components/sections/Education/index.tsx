import {
  REGISTRY,
  type EducationContent,
  type EducationItem,
} from '@openportfolio/registry';
import {
  Card,
  DescriptionList,
  DescriptionListItem,
  Grid,
  Heading,
  SectionShell,
  Stack,
  Text,
} from '@/components/ui';
import { fieldRuns, renderRuns, type RunWrappers } from '../fields';

/**
 * Education (business req 6, FR-SEC-EDU-1).
 *
 * GPA, coursework, scholarships and honours are each individually hideable —
 * which here needs no flag: an omitted field has no renderer output, so it
 * leaves no label and no row behind.
 *
 * The default position below experience and projects is a matter of section
 * order, which the tenant controls (FR-CFG-3) and the payload carries. This
 * component does not assume where on the page it sits.
 */
const RENDERERS = {
  degree: (item: EducationItem) =>
    item.degree ? (
      <Heading level={3} visual="card">
        {item.degree}
      </Heading>
    ) : null,

  institution: (item: EducationItem) =>
    item.institution ? (
      <Text variant="detail" tone="muted">
        {item.institution}
      </Text>
    ) : null,

  graduated: (item: EducationItem) =>
    item.graduated ? (
      <Text variant="meta" tone="muted">
        {item.graduated}
      </Text>
    ) : null,

  gpa: (item: EducationItem) =>
    item.gpa ? (
      <DescriptionListItem label="GPA" layout="inline">
        {item.gpa}
      </DescriptionListItem>
    ) : null,

  coursework: (item: EducationItem) =>
    item.coursework && item.coursework.length > 0 ? (
      <DescriptionListItem
        label="Coursework"
        layout="inline"
        valueStyle="technical"
      >
        {item.coursework.join(' · ')}
      </DescriptionListItem>
    ) : null,

  scholarships: (item: EducationItem) =>
    item.scholarships && item.scholarships.length > 0 ? (
      <DescriptionListItem label="Scholarships" layout="inline">
        {item.scholarships.join(', ')}
      </DescriptionListItem>
    ) : null,

  honours: (item: EducationItem) =>
    item.honours && item.honours.length > 0 ? (
      <DescriptionListItem label="Honours" layout="inline">
        {item.honours.join(', ')}
      </DescriptionListItem>
    ) : null,
};

const WRAPPERS: RunWrappers = {
  headline: (nodes) => (
    <Stack gap="4" className="min-w-0">
      {nodes}
    </Stack>
  ),
  dates: (nodes) => <Stack gap="0">{nodes}</Stack>,
  detail: (nodes) => <DescriptionList layout="inline">{nodes}</DescriptionList>,
};

function EducationEntry({ item }: { item: EducationItem }) {
  const runs = fieldRuns(REGISTRY.education.itemFields, item, RENDERERS);

  return (
    <Card as="li" padding="roomy" radius="lg" className="flex flex-col gap-12">
      {renderRuns(runs, WRAPPERS)}
    </Card>
  );
}

export function Education({ content }: { content: EducationContent }) {
  const items = content.items ?? [];

  return (
    <SectionShell id="education" heading={REGISTRY.education.label}>
      <Grid as="ul" tracks="pairs" gap="grid-gap" alignStart>
        {items.map((item) => (
          <EducationEntry key={item.id} item={item} />
        ))}
      </Grid>
    </SectionShell>
  );
}
