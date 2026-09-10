'use client';

import { useRef, useState } from 'react';
import { REGISTRY, type ProjectItem } from '@portfolio/registry';
import {
  Badge,
  Card,
  DescriptionList,
  DescriptionListItem,
  Grid,
  Heading,
  Image,
  Stack,
  Tag,
  TagList,
  TagListItem,
  Text,
} from '@/components/ui';
import { fieldRuns, renderRuns, type RunWrappers } from '../fields';
import { ProjectModal } from './ProjectModal';

/**
 * The project grid, and the one piece of state behind it: which case study is
 * open.
 *
 * This is the only client component in the section. The cards it draws are
 * static — the interactivity is that each *is* a button, and that one dialog
 * sits alongside them. Keeping the state here rather than inside a card is
 * what lets a single dialog serve all of them, and what lets its content swap
 * without unmounting.
 *
 * The card itself is unchanged from the fifteen-second read it always was:
 * screenshot, category, year, title, then problem / impact / stack. What the
 * card no longer carries is the detail — solution, role, and the demo and
 * repository links have moved into the case study, which is where the design
 * puts them once the card becomes a single control. A link inside a button is
 * not something to style around; it is invalid, and it is why the card cannot
 * both open the dialog and keep its own links.
 */
const CARD_RENDERERS = {
  screenshot: (item: ProjectItem) =>
    item.screenshot ? (
      <Image
        src={item.screenshot.src}
        alt={item.screenshot.alt}
        width={item.screenshot.width}
        height={item.screenshot.height}
        radius="sm"
        className="aspect-shot w-full border border-border"
      />
    ) : null,

  category: (item: ProjectItem) =>
    item.category ? <Badge variant="accent">{item.category}</Badge> : null,

  year: (item: ProjectItem) =>
    item.year ? (
      <Text variant="meta" tone="muted">
        {item.year}
      </Text>
    ) : null,

  title: (item: ProjectItem) =>
    item.title ? (
      <Heading level={3} visual="card">
        {item.title}
      </Heading>
    ) : null,

  problem: (item: ProjectItem) =>
    item.problem ? (
      <DescriptionListItem label="Problem">{item.problem}</DescriptionListItem>
    ) : null,

  /* FR-SEC-PROJ-5: required, and the design gives it the heavier weight. */
  impact: (item: ProjectItem) =>
    item.impact ? (
      <DescriptionListItem label="Impact" emphasis>
        {item.impact}
      </DescriptionListItem>
    ) : null,

  stack: (item: ProjectItem) =>
    item.stack && item.stack.length > 0 ? (
      <DescriptionListItem label="Stack" valueStyle="technical">
        {item.stack.join(' · ')}
      </DescriptionListItem>
    ) : null,

  /* The one-line versions, muted below Problem and Impact. Their long
     counterparts are `bodies.solution` and `bodies.role` in the modal — these
     two are the card's own summary, not a truncation of those. */
  solution: (item: ProjectItem) =>
    item.solution ? (
      <DescriptionListItem label="Solution" tone="muted">
        {item.solution}
      </DescriptionListItem>
    ) : null,

  role: (item: ProjectItem) =>
    item.role ? (
      <DescriptionListItem label="My role" tone="muted">
        {item.role}
      </DescriptionListItem>
    ) : null,
};

const CARD_WRAPPERS: RunWrappers = {
  meta: (nodes) => (
    <Stack direction="row" wrap align="baseline" gapX="10" gapY="6">
      {nodes}
    </Stack>
  ),
  summary: (nodes) => <DescriptionList>{nodes}</DescriptionList>,
};

function ProjectCard({
  item,
  onOpen,
}: {
  item: ProjectItem;
  onOpen: (item: ProjectItem, trigger: HTMLElement) => void;
}) {
  const runs = fieldRuns(REGISTRY.projects.itemFields, item, CARD_RENDERERS);

  return (
    <li className="flex min-w-0">
      <Card
        as="button"
        padding="roomy"
        radius="lg"
        aria-haspopup="dialog"
        onClick={(event) => onOpen(item, event.currentTarget)}
        className="flex flex-auto flex-col gap-14"
      >
        {renderRuns(runs, CARD_WRAPPERS)}

        {/* Pinned to the card's floor by `mt-auto`, so the affordance lines up
            across a row of cards of differing text length. */}
        <Stack
          direction="row"
          align="center"
          gap="8"
          className="mt-auto border-t border-border pt-12"
        >
          <Text variant="caption" tone="accent">
            Read the case study
          </Text>
          <Text variant="caption" tone="accent" aria-hidden="true">
            &rarr;
          </Text>
        </Stack>
      </Card>
    </li>
  );
}

/** The filter's resting state: every project, no category chosen. */
const ALL = 'All';

export interface ProjectGalleryProps {
  items: readonly ProjectItem[];
  /** Tenant-editable filter categories (FR-SEC-PROJ-7). */
  categories?: readonly string[];
}

export function ProjectGallery({ items, categories }: ProjectGalleryProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(ALL);
  /* The card that opened the dialog. Captured from the click rather than read
     back from `document.activeElement`, which Safari does not set on a button
     click — see Dialog's `returnFocusTo`. */
  const triggerRef = useRef<HTMLElement | null>(null);

  /*
   * Only categories some project actually uses. A tenant may leave a category
   * configured after deleting the last project in it, and a filter that
   * reliably yields nothing is worse than no filter — business req 18.1
   * applied to a control rather than to a section.
   */
  const used = (categories ?? []).filter((name) =>
    items.some((item) => item.category === name),
  );
  const active = used.includes(category) ? category : ALL;
  const shown =
    active === ALL ? items : items.filter((item) => item.category === active);

  /* Derived, not stored: a project filtered out of view — or removed from the
     payload — cannot leave a stale copy of itself open. */
  const open = shown.find((item) => item.id === openId) ?? null;

  return (
    <>
      {/* Filtering is client-side over data already rendered (FR-SEC-PROJ-7),
          so no project leaves the initial HTML when a filter is applied. */}
      {used.length > 0 ? (
        <Stack
          as="nav"
          direction="row"
          wrap
          align="baseline"
          justify="between"
          gapX="24"
          gapY="8"
          label="Filter projects by category"
          className="mb-filter-gap"
        >
          <TagList>
            {[ALL, ...used].map((name) => (
              <TagListItem key={name}>
                <Tag
                  variant={name === active ? 'selected' : 'neutral'}
                  current={name === active}
                  onClick={() => {
                    setCategory(name);
                    /* Refiltering with a case study open would leave the
                       dialog showing a project no longer in the grid. */
                    setOpenId(null);
                  }}
                >
                  {name}
                </Tag>
              </TagListItem>
            ))}
          </TagList>

          <Text variant="caption" tone="muted">
            {shown.length} {shown.length === 1 ? 'project' : 'projects'}
            {active === ALL ? '' : ` in ${active}`}
          </Text>
        </Stack>
      ) : null}

      <Grid as="ul" tracks="cards" gap="grid-gap">
        {shown.map((item) => (
          <ProjectCard
            key={item.id}
            item={item}
            onOpen={(project, trigger) => {
              triggerRef.current = trigger;
              setOpenId(project.id);
            }}
          />
        ))}
      </Grid>

      <ProjectModal
        project={open}
        onClose={() => setOpenId(null)}
        returnFocusTo={triggerRef}
      />
    </>
  );
}
