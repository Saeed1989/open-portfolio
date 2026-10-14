import Script from 'next/script';
import {
  CREDLY_ORIGIN,
  REGISTRY,
  type AchievementItem,
  type AchievementsContent,
  type FieldDescriptor,
  type TrainingsContent,
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

/**
 * Achievements and Trainings — one component, two section types. Both declare
 * the same fields in the same order; the walk is driven by whichever
 * descriptor `sectionType` selects, and the heading is that descriptor's
 * label.
 *
 * Credly badges are items in the achievements collection, told apart by
 * `source` and drawn as a group of their own. Trainings declares no badge
 * field, so the badge treatment is switched off for it — see `BADGE_FIELD`.
 *
 * Nothing here is fetched. A badge is stored as a UUID; the element is built
 * from it, and Credly's script turns it into an iframe in the visitor's
 * browser. No pasted markup is ever injected.
 */
/**
 * The section types this component serves.
 *
 * Both are collections of the same credential-shaped item, which is why one
 * component covers them. It is not a general-purpose base class — a third type
 * belongs here only if it declares the same fields.
 */
export type CredentialSectionType = 'achievements' | 'trainings';

/**
 * `AchievementItem` is the wider of the two item shapes: a training item is an
 * achievement item minus three optional Credly fields it never sets, so it is
 * assignable here and the renderers below simply find those fields absent.
 */
export type CredentialContent = AchievementsContent | TrainingsContent;

/**
 * The field whose presence in a descriptor turns the badge treatment on.
 *
 * Asking the registry rather than comparing the section type keeps the rule
 * where the rest of this component's behaviour already lives: a section that
 * declares no badge field has no badges, whatever it is called, and a payload
 * that smuggles `source: 'credly'` into a trainings item cannot conjure a
 * frame the descriptor never declared.
 */
const BADGE_FIELD = 'credlyBadgeId';

const TYPE_LABELS: Record<AchievementItem['type'], string> = {
  certification: 'Certification',
  award: 'Award',
  ranking: 'Ranking',
  hackathon: 'Hackathon',
};

/** Loaded once per page, not once per badge: it scans for every element. */
const CREDLY_EMBED_SCRIPT = 'https://cdn.credly.com/assets/utilities/embed.js';

/**
 * Credly's own iframe dimensions.
 *
 * These are not ours to choose, and they are load-bearing twice over.
 *
 * The script reads `data-iframe-width` and `data-iframe-height` with
 * `getNamedItem(...).value` and no null check, so a badge element missing
 * either one throws and kills the loop for *every* badge on the page, not just
 * that one. They are required attributes despite reading like hints.
 *
 * It then replaces the element wholesale via `outerHTML`, building the
 * iframe's own inline size from those two numbers. The style below therefore
 * survives only as long as the div does — its job is to hold the same box open
 * beforehand so the frame lands into space that already exists rather than
 * shoving the page down. The two must agree, which is
 * why both read from here.
 *
 * The reserved box carries no border or background, so one the script never
 * fills reads as whitespace rather than as a broken panel.
 *
 * The height is taller than the 150x270 Credly's own share dialog suggests.
 * Their iframe is `scrolling="no"`, so anything past the bottom edge is cut
 * off rather than scrolled to — and 270 only fits a short issuer name. A long
 * one ("Amazon Web Services Training and Certification") wraps to three lines
 * and, with an expiry chip above it, pushes the issuer and Credly's own
 * footer out of view. Sized for the worst case: a badge that needs less
 * simply sits in more whitespace, which costs nothing.
 */
const BADGE_FRAME = { width: 150, height: 320 } as const;

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

  verifyUrl: (item: AchievementItem) =>
    item.verifyUrl ? (
      <Link href={item.verifyUrl} variant="underline">
        Verify
      </Link>
    ) : null,
};

/**
 * The same fields, drawn for a badge: the frame, and nothing visible beside
 * it. Fields with no renderer here are skipped by the walk.
 *
 * The title and issuer are rendered but visually hidden: the frame is a
 * cross-origin iframe with a generic title, so without this text a screen
 * reader is never told which badge it is.
 */
const CREDLY_RENDERERS = {
  credlyBadgeId: (item: AchievementItem) =>
    item.credlyBadgeId ? (
      /* The outer element is the styling hook. The inner one is consumed by
         the embed script, which replaces it — class and all — with the
         iframe, leaving the iframe as a child of this wrapper. */
      <div className="credly-badge-slot">
        <div
          data-share-badge-id={item.credlyBadgeId}
          data-share-badge-host={CREDLY_ORIGIN}
          data-iframe-width={BADGE_FRAME.width}
          data-iframe-height={BADGE_FRAME.height}
          style={{ width: '100%', height: BADGE_FRAME.height }}
        />
      </div>
    ) : null,

  title: (item: AchievementItem) =>
    item.title ? <span className="sr-only">{item.title}</span> : null,

  issuer: (item: AchievementItem) =>
    item.issuer ? <span className="sr-only">{`Issued by ${item.issuer}`}</span> : null,
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

interface ItemProps {
  item: AchievementItem;
  /** The descriptor's `itemFields`, so the walk cannot name a section. */
  fields: readonly FieldDescriptor[];
}

function Credential({ item, fields }: ItemProps) {
  const runs = fieldRuns(fields, item, RENDERERS);

  return (
    <Card as="li" padding="roomy" radius="lg" className="flex flex-col gap-10">
      {renderRuns(runs, WRAPPERS)}
    </Card>
  );
}

function CredlyBadge({ item, fields }: ItemProps) {
  const runs = fieldRuns(fields, item, CREDLY_RENDERERS);

  /* No wrappers: nothing but the frame is visible, so there is no run of
     grouped fields left to enclose. */
  return <Stack as="li">{renderRuns(runs)}</Stack>;
}

/**
 * The shared implementation. `sectionType` selects the descriptor, and the
 * descriptor supplies the rest — heading, field order, and whether badges
 * exist at all.
 */
export function CredentialSection({
  sectionType,
  content,
}: {
  sectionType: CredentialSectionType;
  content: CredentialContent;
}) {
  const descriptor = REGISTRY[sectionType];
  const fields: readonly FieldDescriptor[] = descriptor.itemFields;

  const items: readonly AchievementItem[] = content.items ?? [];

  const badged = fields.some((field) => field.key === BADGE_FIELD);
  const badges = badged
    ? items.filter((item) => item.source === 'credly')
    : [];
  const manual = badged
    ? items.filter((item) => item.source !== 'credly')
    : items;

  return (
    <SectionShell id={sectionType} heading={descriptor.label}>
      <Stack gap="stack-lg">
        {manual.length > 0 ? (
          <Grid as="ul" tracks="cards" gap="grid-gap">
            {manual.map((item) => (
              <Credential key={item.id} item={item} fields={fields} />
            ))}
          </Grid>
        ) : null}

        {badges.length > 0 ? (
          <Stack gap="stack-md">
            <Heading level={3} visual="group">
              Verified badges
            </Heading>

            <Grid as="ul" tracks="groups" gap="grid-gap" alignStart>
              {badges.map((item) => (
                <CredlyBadge key={item.id} item={item} fields={fields} />
              ))}
            </Grid>

            {/* Once for the section, whatever the badge count. The script
                scans the document for every [data-share-badge-id] element, so
                a second copy would be redundant work and a second request. */}
            <Script src={CREDLY_EMBED_SCRIPT} strategy="lazyOnload" />
          </Stack>
        ) : null}
      </Stack>
    </SectionShell>
  );
}

/**
 * The achievements entry point. It exists so the section registry maps a type
 * to a component of its own name; the implementation is the shared one above.
 */
export function Achievements({ content }: { content: AchievementsContent }) {
  return <CredentialSection sectionType="achievements" content={content} />;
}
