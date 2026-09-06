'use client';

import type { ReactNode, RefObject } from 'react';
import { REGISTRY, type ProjectItem } from '@openportfolio/registry';
import {
  Button,
  Dialog,
  Heading,
  RichText,
  Stack,
  Tag,
  TagList,
  TagListItem,
  Text,
} from '@/components/ui';
import {
  fieldRuns,
  renderRuns,
  type FieldRenderers,
  type RunWrappers,
} from '../fields';

/**
 * The case study behind a project card — the deeper of the two depths
 * FR-SEC-PROJ-6 asks for, and the resolution of SRS §10.3 open question 3:
 * a dialog over the page, not a route of its own.
 *
 * Everything about *being* a dialog — the focus trap, the scroll lock, the
 * close control, Escape, the backdrop — belongs to the Dialog primitive. What
 * is here is only what a project puts inside one.
 *
 * The seven labelled sub-sections are walked out of the registry rather than
 * written as JSX, exactly as the card is, so both depths take their order from
 * the same declaration and neither can drift from it (FR-REG-2). Their labels
 * come from the descriptors too — the heading a visitor reads and the label
 * the tenant fills in are the same string by construction.
 */

/* One dialog exists at a time, so this is stable across a content swap. */
const TITLE_ID = 'case-study-title';

/** The content of each sub-section, without its label. */
const SUBSECTION_CONTENT: Record<
  string,
  (item: ProjectItem) => ReactNode
> = {
  'bodies.business': (item) =>
    item.bodies?.business ? <RichText html={item.bodies.business} /> : null,

  'bodies.solution': (item) =>
    item.bodies?.solution ? <RichText html={item.bodies.solution} /> : null,

  designation: (item) =>
    item.designation ? (
      <Text variant="body" balance>
        {item.designation}
      </Text>
    ) : null,

  'bodies.role': (item) =>
    item.bodies?.role ? <RichText html={item.bodies.role} /> : null,

  stackWorkedOn: (item) => <Chips label="Tech stack I worked on" tags={item.stackWorkedOn} />,
  tools: (item) => <Chips label="Tools" tags={item.tools} />,
  fullStack: (item) => <Chips label="Full tech stack" tags={item.fullStack} />,
};

function Chips({
  label,
  tags,
}: {
  label: string;
  tags?: readonly string[];
}) {
  if (!tags || tags.length === 0) return null;

  return (
    <TagList label={label}>
      {tags.map((tag) => (
        <TagListItem key={tag}>
          <Tag>{tag}</Tag>
        </TagListItem>
      ))}
    </TagList>
  );
}

/** A labelled region: the design's hairline, uppercase rule, then content. */
function CaseSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 border-t border-border pt-14">
      <Heading level={3} visual="group" className="mb-10">
        {label}
      </Heading>
      {children}
    </section>
  );
}

/*
 * Built from the descriptors, so a field added to the registry's `body` group
 * appears here as a labelled section without this file changing — and a
 * renderer with no matching descriptor draws nothing, rather than appearing in
 * an order nobody declared.
 */
const SUBSECTION_RENDERERS: FieldRenderers<ProjectItem> = Object.fromEntries(
  REGISTRY.projects.itemFields
    .filter((field) => field.key in SUBSECTION_CONTENT)
    .map((field) => [
      field.key,
      (item: ProjectItem) => {
        const content = SUBSECTION_CONTENT[field.key](item);
        return content ? (
          <CaseSection label={field.label}>{content}</CaseSection>
        ) : null;
      },
    ]),
);

/* All seven share one group, so the walk returns them as a single run and this
   wraps the set once. */
const SUBSECTION_WRAPPERS: RunWrappers = {
  body: (nodes) => (
    <Stack direction="column" gap="stack-lg">
      {nodes}
    </Stack>
  ),
};

export interface ProjectModalProps {
  /** The project to show. Null closes the dialog. */
  project: ProjectItem | null;
  onClose: () => void;
  /** The card that opened it — focused again on close. */
  returnFocusTo: RefObject<HTMLElement | null>;
}

export function ProjectModal({
  project,
  onClose,
  returnFocusTo,
}: ProjectModalProps) {
  /* Keeps the dialog mounted while the project swaps: `open` stays true and
     only the content changes, so switching projects does not flash the page
     between a close and a re-open. */
  const open = project !== null;

  const runs = project
    ? fieldRuns(REGISTRY.projects.itemFields, project, SUBSECTION_RENDERERS)
    : [];

  /* FR-SEC-PROJ-4: confidential work never offers a repository, whether or not
     one happens to be recorded — the note stands in its place. */
  const showRepo = Boolean(project?.repoUrl) && !project?.confidential;

  const eyebrow = [project?.category, project?.year].filter(Boolean);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy={TITLE_ID}
      returnFocusTo={returnFocusTo}
      closeLabel="Close case study"
      header={
        <>
          <Text variant="label" as="p" tone="muted" className="mb-6">
            {['Case study', ...eyebrow].join(' · ')}
          </Text>
          <Heading level={2} id={TITLE_ID}>
            {project?.title}
          </Heading>
        </>
      }
      footer={
        <>
          {project?.demoUrl ? (
            <Button href={project.demoUrl} variant="primary">
              Live demo
            </Button>
          ) : null}
          {showRepo && project?.repoUrl ? (
            <Button href={project.repoUrl} variant="secondary">
              Source
            </Button>
          ) : null}
          {project?.confidential ? (
            <Text variant="caption" tone="muted">
              Client work — source not public
            </Text>
          ) : null}
        </>
      }
    >
      {/*
        No screenshot in here, deliberately. The card already carries the
        project's one image, and the case study is a reading surface — the
        impact leads it and the prose follows. That is also what keeps the
        dialog short enough to scroll on a phone.
      */}
      {project ? (
        <>
          {/* FR-SEC-PROJ-5: the impact leads the case study, as a pull-quote. */}
          {project.impact ? (
            <Text variant="tagline" balance className="max-w-pull">
              {project.impact}
            </Text>
          ) : null}

          {renderRuns(runs, SUBSECTION_WRAPPERS)}
        </>
      ) : null}
    </Dialog>
  );
}
