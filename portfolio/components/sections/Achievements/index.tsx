import Script from 'next/script';
import {
  CREDLY_ORIGIN,
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
 *
 * Credly badges are items in this same collection, told apart by `source` and
 * drawn as a group of their own. There is no second collection and no `credly`
 * section type: one flat array keeps the registry contract intact (FR-REG-3)
 * and lets an imported badge be edited, reordered and deleted exactly like a
 * hand-written entry.
 *
 * Nothing here is fetched. A badge is stored as a UUID; the element below is
 * built by us from that UUID, and Credly's own script — loaded once for the
 * whole section — turns it into an iframe in the visitor's browser. The
 * pasted embed code is parsed server-side and thrown away, never stored and
 * never injected, so there is no `dangerouslySetInnerHTML` anywhere in this
 * path and no route from a tenant's paste box to executable markup
 * (FR-THM-6, NFR-SEC-2).
 */
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
 * shoving the page down (FR-MED-6, NFR-PERF-2). The two must agree, which is
 * why both read from here.
 *
 * The reserved box carries no border or background, so one the script never
 * fills reads as whitespace rather than as a broken panel.
 */
const BADGE_FRAME = { width: 150, height: 270 } as const;

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
 * The same fields, drawn for a badge.
 *
 * `type` is deliberately absent: every imported badge is a certification, so
 * the chip would repeat itself down the whole block. A field with no renderer
 * is skipped by the walk, which is the mechanism for exactly this — the field
 * stays declared, validated and ordered, it simply draws nothing here.
 *
 * The title and issuer are ordinary text, and that is not decoration. The
 * badge itself is an iframe: opaque to a screen reader, unreachable by our
 * theme, and gone entirely if the script never loads. The text beside it is
 * the only carrier of what the badge says, so it renders whatever happens
 * (NFR-A11Y-1, business req 13.5).
 */
const CREDLY_RENDERERS = {
  credlyBadgeId: (item: AchievementItem) =>
    item.credlyBadgeId ? (
      <div
        data-share-badge-id={item.credlyBadgeId}
        data-share-badge-host={CREDLY_ORIGIN}
        data-iframe-width={BADGE_FRAME.width}
        data-iframe-height={BADGE_FRAME.height}
        style={{ width: BADGE_FRAME.width, height: BADGE_FRAME.height }}
      />
    ) : null,

  date: RENDERERS.date,

  title: (item: AchievementItem) =>
    item.title ? (
      <Heading level={4} visual="card">
        {item.title}
      </Heading>
    ) : null,

  issuer: RENDERERS.issuer,
  url: RENDERERS.url,
  verifyUrl: RENDERERS.verifyUrl,
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

/** As above, minus the card's push-to-bottom: a badge is not a filled panel. */
const CREDLY_WRAPPERS: RunWrappers = {
  meta: WRAPPERS.meta,
  links: (nodes) => (
    <Stack direction="row" wrap gapX="18" gapY="6">
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

function CredlyBadge({ item }: { item: AchievementItem }) {
  const runs = fieldRuns(
    REGISTRY.achievements.itemFields,
    item,
    CREDLY_RENDERERS,
  );

  return (
    <Stack as="li" gap="8">
      {renderRuns(runs, CREDLY_WRAPPERS)}
    </Stack>
  );
}

export function Achievements({ content }: { content: AchievementsContent }) {
  const items = content.items ?? [];
  const badges = items.filter((item) => item.source === 'credly');
  const manual = items.filter((item) => item.source !== 'credly');

  return (
    <SectionShell id="achievements" heading={REGISTRY.achievements.label}>
      <Stack gap="stack-lg">
        {manual.length > 0 ? (
          <Grid as="ul" tracks="cards" gap="grid-gap">
            {manual.map((item) => (
              <Achievement key={item.id} item={item} />
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
                <CredlyBadge key={item.id} item={item} />
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
