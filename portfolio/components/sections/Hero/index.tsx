import { REGISTRY, type Cta, type HeroContent } from '@openportfolio/registry';
import {
  Avatar,
  Button,
  Heading,
  PageSection,
  Stack,
  Text,
} from '@/components/ui';
import { fieldRuns, renderRuns, type RunWrappers } from '../fields';

/**
 * The hero (business req 1, FR-SEC-HERO-1..3).
 *
 * It is the one section with no section heading of its own — it labels the
 * landmark with the name itself — so it composes PageSection directly rather
 * than SectionShell, and takes the design's taller hero padding with no rule
 * above it.
 *
 * FR-SEC-HERO-3: with no avatar the `portrait` run renders nothing, and the
 * text column simply grows into the space. There is no placeholder and no
 * reserved gap.
 */
const RENDERERS = {
  title: (content: HeroContent) =>
    content.title ? (
      <Text variant="eyebrow" tone="accent" className="mb-stack-sm">
        {content.title}
      </Text>
    ) : null,

  name: (content: HeroContent) =>
    content.name ? (
      <Heading level={1} visual="display" id="hero-heading">
        {content.name}
      </Heading>
    ) : null,

  tagline: (content: HeroContent) =>
    content.tagline ? (
      <Text
        variant="tagline"
        balance
        className="mt-stack-sm max-w-tagline"
      >
        {content.tagline}
      </Text>
    ) : null,

  bio: (content: HeroContent) =>
    content.bio ? (
      <Text variant="lead" tone="muted" balance className="mt-stack-md max-w-bio">
        {content.bio}
      </Text>
    ) : null,

  ctas: (content: HeroContent) => {
    const ctas = content.ctas ?? [];
    if (ctas.length === 0) return null;

    return (
      <Stack direction="row" wrap gap="12" className="mt-stack-lg">
        {ctas.map((cta: Cta, index: number) => (
          <Button
            key={`${cta.kind}-${cta.href}`}
            href={cta.href}
            variant={index === 0 ? 'primary' : 'secondary'}
            /* A résumé is a file to keep, not a page to visit. */
            download={cta.kind === 'resume' ? true : undefined}
          >
            {cta.label}
          </Button>
        ))}
      </Stack>
    );
  },

  avatar: (content: HeroContent) =>
    content.avatar ? (
      <Avatar src={content.avatar.src} alt={content.avatar.alt} />
    ) : null,
};

const WRAPPERS: RunWrappers = {
  /* `basis-hero` is the design's `flex: 1 1 340px` — the width at which the
     portrait drops below the text rather than squeezing it. */
  intro: (nodes) => <Stack className="shrink grow basis-hero">{nodes}</Stack>,
  portrait: (nodes) => <Stack className="shrink-0 grow-0">{nodes}</Stack>,
};

export function Hero({ content }: { content: HeroContent }) {
  const runs = fieldRuns(REGISTRY.hero.fields, content, RENDERERS);

  return (
    <PageSection
      id="hero"
      labelledBy="hero-heading"
      padding="hero"
      divided={false}
    >
      <Stack direction="row" wrap gap="hero-gap" align="start">
        {renderRuns(runs, WRAPPERS)}
      </Stack>
    </PageSection>
  );
}
