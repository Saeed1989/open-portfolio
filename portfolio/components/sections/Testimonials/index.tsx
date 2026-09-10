import {
  REGISTRY,
  type Testimonial,
  type TestimonialsContent,
} from '@portfolio/registry';
import {
  Avatar,
  Card,
  Grid,
  SectionShell,
  Stack,
  Text,
} from '@/components/ui';
import { fieldRuns, renderRuns, type RunWrappers } from '../fields';

/**
 * Testimonials (business req 8, FR-SEC-TEST-1).
 *
 * The 2–4 count is enforced by the API. The photo is optional and its absence
 * closes up rather than leaving a hole — the attribution row is a wrapping
 * flex line, not a fixed two-column grid.
 */
const RENDERERS = {
  quote: (item: Testimonial) =>
    item.quote ? (
      <Text as="blockquote" variant="lead" balance className="m-0">
        {item.quote}
      </Text>
    ) : null,

  photo: (item: Testimonial) =>
    item.photo ? (
      <Avatar size="fixed" src={item.photo.src} alt={item.photo.alt} />
    ) : null,

  name: (item: Testimonial) =>
    item.name ? <Text variant="detail">{item.name}</Text> : null,

  role: (item: Testimonial) =>
    item.role ? (
      <Text variant="meta" tone="muted">
        {item.role}
      </Text>
    ) : null,

  company: (item: Testimonial) =>
    item.company ? (
      <Text variant="meta" tone="muted">
        {item.company}
      </Text>
    ) : null,
};

const WRAPPERS: RunWrappers = {
  attribution: (nodes) => (
    <Stack
      direction="row"
      wrap
      align="center"
      gapX="12"
      gapY="6"
      className="mt-auto pt-4"
    >
      {nodes}
    </Stack>
  ),
};

function TestimonialCard({ item }: { item: Testimonial }) {
  const runs = fieldRuns(REGISTRY.testimonials.itemFields, item, RENDERERS);

  return (
    <Card as="li" padding="roomy" radius="lg" className="flex flex-col gap-14">
      {renderRuns(runs, WRAPPERS)}
    </Card>
  );
}

export function Testimonials({ content }: { content: TestimonialsContent }) {
  const items = content.items ?? [];

  return (
    <SectionShell id="testimonials" heading={REGISTRY.testimonials.label}>
      <Grid as="ul" tracks="cards" gap="grid-gap">
        {items.map((item) => (
          <TestimonialCard key={item.id} item={item} />
        ))}
      </Grid>
    </SectionShell>
  );
}
