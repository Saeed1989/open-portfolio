import { Fragment, type ReactNode } from 'react';
import type { FieldDescriptor } from '@openportfolio/registry';

/**
 * Field order comes from the registry, never from JSX order.
 *
 * A section declares one renderer per field key and hands the descriptor's
 * `fields` / `itemFields` array to `fieldRuns`. The walk is what produces the
 * markup, so a section physically cannot render its fields in an order the
 * registry did not declare (FR-REG-2), and every item in a collection is laid
 * out identically because they all walk the same array.
 *
 * Two kinds of field draw nothing and are skipped rather than special-cased:
 * one with no renderer (declared for admin only — a skill's `category` is a
 * grouping key, not a visible field) and one whose renderer returns nothing
 * because the value is absent.
 */
export type FieldRenderer<T> = (content: T) => ReactNode;

export type FieldRenderers<T> = Readonly<Record<string, FieldRenderer<T>>>;

export interface FieldRun {
  /** The descriptor's group name, or undefined for an ungrouped field. */
  readonly group: string | undefined;
  /** Key of the first field in the run — stable enough to key React on. */
  readonly key: string;
  readonly nodes: readonly ReactNode[];
}

/**
 * Walks `fields` in declared order and collects the rendered nodes, merging a
 * consecutive run of fields that share a group name into one entry. The group
 * only decides what encloses a run — it can never reorder it.
 */
export function fieldRuns<T>(
  fields: readonly FieldDescriptor[],
  content: T,
  renderers: FieldRenderers<T>,
): FieldRun[] {
  const runs: { group: string | undefined; key: string; nodes: ReactNode[] }[] =
    [];

  for (const field of fields) {
    const render = renderers[field.key];
    if (!render) continue;

    const node = render(content);
    if (node === null || node === undefined || node === false || node === '') {
      continue;
    }

    const keyed = <Fragment key={field.key}>{node}</Fragment>;
    const last = runs[runs.length - 1];

    if (last && field.group !== undefined && last.group === field.group) {
      last.nodes.push(keyed);
    } else {
      runs.push({ group: field.group, key: field.key, nodes: [keyed] });
    }
  }

  return runs;
}

/** Wraps a run of grouped fields. Keyed by the descriptor's group name. */
export type RunWrappers = Readonly<
  Record<string, (nodes: readonly ReactNode[]) => ReactNode>
>;

/** Renders runs, passing each grouped run through its wrapper. */
export function renderRuns(
  runs: readonly FieldRun[],
  wrappers: RunWrappers = {},
): ReactNode[] {
  return runs.map((run) => {
    const wrap = run.group === undefined ? undefined : wrappers[run.group];
    return (
      <Fragment key={run.key}>{wrap ? wrap(run.nodes) : run.nodes}</Fragment>
    );
  });
}

/** Runs whose group matches, for a section that places groups itself. */
export function runsInGroup(
  runs: readonly FieldRun[],
  group: string | undefined,
): FieldRun[] {
  return runs.filter((run) => run.group === group);
}
