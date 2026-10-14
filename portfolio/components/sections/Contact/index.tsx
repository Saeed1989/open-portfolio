import {
  REGISTRY,
  type ContactContent,
  type ContactLink,
} from '@portfolio/registry';
import {
  Grid,
  Heading,
  Link,
  PageSection,
  Stack,
  Text,
} from '@/components/ui';
import { fieldRuns, runsInGroup } from '../fields';

/**
 * Contact. The design puts the heading and intro in the left column of a
 * two-up grid, so this composes PageSection directly instead of SectionShell.
 * Each link carries its own `visible` flag, and a hidden one renders nothing.
 *
 * NOT SATISFIED — the published address should be assembled client-side
 * against naive scrapers. That needs a client component; the mailto: below is
 * plain.
 */
function row(link: ContactLink | undefined) {
  if (!link || !link.visible || !link.value) return null;

  return (
    <Stack as="li" gap="0" className="border-b border-border">
      <Link
        href={link.href}
        variant="quiet"
        className="flex min-h-tap-lg flex-wrap items-baseline justify-between gap-x-16 gap-y-6 break-all py-12"
      >
        <Text variant="label" tone="muted">
          {link.label}
        </Text>
        <Text variant="body" as="span">
          {link.value}
        </Text>
      </Link>
    </Stack>
  );
}

const RENDERERS = {
  intro: (content: ContactContent) =>
    content.intro ? (
      <Text variant="body" tone="muted" balance className="max-w-intro">
        {content.intro}
      </Text>
    ) : null,

  email: (content: ContactContent) => row(content.email),
  github: (content: ContactContent) => row(content.github),
  linkedin: (content: ContactContent) => row(content.linkedin),
  x: (content: ContactContent) => row(content.x),
  site: (content: ContactContent) => row(content.site),
};

export function Contact({ content }: { content: ContactContent }) {
  const runs = fieldRuns(REGISTRY.contact.fields, content, RENDERERS);
  const intro = runsInGroup(runs, undefined);
  const links = runsInGroup(runs, 'links');

  return (
    <PageSection id="contact" labelledBy="contact-heading">
      <Grid tracks="pairs" gap="contact-gap" alignStart>
        <Stack gap="14">
          <Heading level={2} id="contact-heading">
            {REGISTRY.contact.label}
          </Heading>
          {intro.map((run) => (
            <Stack key={run.key} gap="0">
              {run.nodes}
            </Stack>
          ))}
        </Stack>

        {links.map((run) => (
          <Stack as="ul" key={run.key} gap="2">
            {run.nodes}
          </Stack>
        ))}
      </Grid>
    </PageSection>
  );
}
