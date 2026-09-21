import { useState } from 'react';
import type {
  CollectionSectionDescriptor,
  FieldDescriptor,
  SectionDescriptor,
} from '../registry';
import { Button, Pill } from '../ui/primitives';
import { FieldRenderer } from './FieldRenderer';
import type { GapMap } from './gaps';
import { itemLabelFor } from './item-label';

/*
 * A descriptor, drawn as a form.
 *
 * `single` and `collection` are the two cardinalities the registry declares
 * (SRS §4). Field order is registry order in both, identically for every item
 * in a collection (FR-REG-2) — this file never sorts, filters by name, or
 * special-cases a key.
 */

export interface SectionFormProps {
  readonly descriptor: SectionDescriptor;
  readonly content: unknown;
  readonly gaps: GapMap;
  /** Field errors from a refused save (D2), keyed by the same paths. */
  readonly refusedErrors: ReadonlyMap<string, string>;
  readonly disabled?: boolean | undefined;
  readonly onChange: (content: unknown) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asObject(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function itemsOf(content: unknown): readonly unknown[] {
  const record = asObject(content);
  return Array.isArray(record.items) ? record.items : [];
}

/**
 * Consecutive fields sharing a `group` are wrapped together.
 *
 * "Consecutive" is the descriptor's word: the group decides what encloses a
 * run of fields, never their sequence. Two runs of the same group name stay
 * two runs.
 */
function groupRuns(
  fields: readonly FieldDescriptor[],
): ReadonlyArray<readonly FieldDescriptor[]> {
  const runs: FieldDescriptor[][] = [];
  let previous: string | undefined;

  for (const field of fields) {
    if (runs.length === 0 || field.group === undefined || field.group !== previous) {
      runs.push([field]);
    } else {
      runs[runs.length - 1]?.push(field);
    }
    previous = field.group;
  }
  return runs;
}

export function SectionForm(props: SectionFormProps) {
  return props.descriptor.cardinality === 'single' ? (
    <SingleForm {...props} />
  ) : (
    <CollectionForm {...props} descriptor={props.descriptor} />
  );
}

function Fields({
  fields,
  scope,
  pathPrefix,
  gaps,
  refusedErrors,
  disabled,
  onFieldChange,
  onVisibilityChange,
}: {
  fields: readonly FieldDescriptor[];
  scope: unknown;
  pathPrefix: string;
  gaps: GapMap;
  refusedErrors: ReadonlyMap<string, string>;
  disabled: boolean | undefined;
  onFieldChange: (key: string, value: unknown) => void;
  onVisibilityChange: (key: string, visible: boolean) => void;
}) {
  return (
    <>
      {groupRuns(fields).map((run, runIndex) => (
        <div
          key={`${pathPrefix}run-${String(runIndex)}`}
          className="flex flex-col gap-[14px]"
        >
          {run.map((field) => {
            const path = `${pathPrefix}${field.key}`;
            const state = gaps.at(path);
            return (
              <FieldRenderer
                key={path}
                field={field}
                scope={scope}
                id={path}
                gap={state.gap}
                gapNote={state.note}
                error={refusedErrors.get(path)}
                disabled={disabled}
                onChange={onFieldChange}
                onVisibilityChange={onVisibilityChange}
              />
            );
          })}
        </div>
      ))}
    </>
  );
}

function SingleForm({
  descriptor,
  content,
  gaps,
  refusedErrors,
  disabled,
  onChange,
}: SectionFormProps) {
  if (descriptor.cardinality !== 'single') return null;

  const record = asObject(content);

  const setField = (key: string, value: unknown) => {
    onChange({ ...record, [key]: value });
  };

  /* A hideable field stores `{ value, visible }`. Toggling visibility keeps
     whatever value is there — FR-SEC-CON-2's "a hidden link keeps its value". */
  const setVisibility = (key: string, visible: boolean) => {
    const existing = record[key];
    const value = isRecord(existing) ? existing.value : undefined;
    onChange({ ...record, [key]: { value, visible } });
  };

  const setHideableValue = (key: string, value: unknown) => {
    const existing = record[key];
    const visible = isRecord(existing) ? existing.visible !== false : true;
    onChange({ ...record, [key]: { value, visible } });
  };

  const hideableKeys = new Set(
    descriptor.fields.filter((field) => field.hideable).map((field) => field.key),
  );

  return (
    <div className="flex flex-col gap-[18px]">
      <Fields
        fields={descriptor.fields}
        scope={record}
        pathPrefix=""
        gaps={gaps}
        refusedErrors={refusedErrors}
        disabled={disabled}
        onFieldChange={(key, value) => {
          if (hideableKeys.has(key)) setHideableValue(key, value);
          else setField(key, value);
        }}
        onVisibilityChange={setVisibility}
      />
    </div>
  );
}

function CollectionForm({
  descriptor,
  content,
  gaps,
  refusedErrors,
  disabled,
  onChange,
}: SectionFormProps & { descriptor: CollectionSectionDescriptor }) {
  const record = asObject(content);
  const rows = itemsOf(content);
  const [openIndex, setOpenIndex] = useState<number | null>(rows.length > 0 ? 0 : null);

  const noun = descriptor.itemNoun ?? 'item';
  const atMax = descriptor.max !== undefined && rows.length >= descriptor.max;

  const writeRows = (next: readonly unknown[]) => {
    onChange({ ...record, items: next });
  };

  const hideableKeys = new Set(
    descriptor.itemFields.filter((field) => field.hideable).map((f) => f.key),
  );

  const setItemField = (index: number, key: string, value: unknown) => {
    const next = [...rows];
    const item = asObject(next[index]);
    if (hideableKeys.has(key)) {
      const existing = item[key];
      const visible = isRecord(existing) ? existing.visible !== false : true;
      next[index] = { ...item, [key]: { value, visible } };
    } else {
      next[index] = { ...item, [key]: value };
    }
    writeRows(next);
  };

  const setItemVisibility = (index: number, key: string, visible: boolean) => {
    const next = [...rows];
    const item = asObject(next[index]);
    const existing = item[key];
    const value = isRecord(existing) ? existing.value : undefined;
    next[index] = { ...item, [key]: { value, visible } };
    writeRows(next);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length || from === to) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    if (moved === undefined) return;
    next.splice(to, 0, moved);
    writeRows(next);
    setOpenIndex(to);
  };

  /* The collection's own failures — `min_items`, `max_items` — are addressed
     to `items` rather than to a field, so they are reported on the collection
     and never inside a row. */
  const collectionGap = gaps.at('items');

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex items-center justify-between gap-[12px]">
        <div className="flex items-center gap-[8px]">
          <span className="font-sans text-[12px] font-medium text-ink">
            {rows.length} {rows.length === 1 ? noun : `${noun}s`}
          </span>
          {descriptor.min !== undefined ? (
            <Pill tone={rows.length < descriptor.min ? 'warn' : 'ok'}>
              min {descriptor.min}
            </Pill>
          ) : null}
          {descriptor.max !== undefined ? (
            <Pill tone={atMax ? 'warn' : 'neutral'}>max {descriptor.max}</Pill>
          ) : null}
        </div>
        {/* FR-SEC-PROJ-2: the cap is refused at save, so the refusal has to
            arrive before authoring rather than after — it sits on the Add
            control, with the reason stated on it. */}
        <Button
          sm
          disabled={disabled || atMax}
          title={atMax ? `The maximum is ${String(descriptor.max)}.` : undefined}
          onClick={() => {
            writeRows([...rows, {}]);
            setOpenIndex(rows.length);
          }}
        >
          + Add {noun}
        </Button>
      </div>

      {atMax ? (
        <p className="m-0 font-sans text-[11.5px] leading-[1.45] text-ink3">
          {`At the maximum of ${String(descriptor.max)} ${noun}s. Remove one to add another.`}
        </p>
      ) : null}

      {collectionGap.note !== undefined ? (
        <p
          className={`m-0 font-sans text-[11.5px] leading-[1.45] ${
            collectionGap.gap === 'blocking' ? 'text-danger' : 'text-ink3'
          }`}
        >
          {collectionGap.note}
        </p>
      ) : null}

      <ol className="flex flex-col gap-[8px]">
        {rows.map((row, index) => {
          const open = openIndex === index;
          const rowGaps = countRowGaps(descriptor, gaps, index);
          return (
            <li
              key={`row-${String(index)}`}
              draggable={!disabled}
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', String(index));
              }}
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                const from = Number(event.dataTransfer.getData('text/plain'));
                if (Number.isInteger(from)) move(from, index);
              }}
              className="rounded-card border border-line bg-surface"
            >
              <div className="flex items-center gap-[10px] p-[11px]">
                <span
                  aria-hidden="true"
                  className="cursor-grab font-mono text-[12px] leading-none tracking-[-1px] text-ink3"
                >
                  {'⋮⋮'}
                </span>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => {
                    setOpenIndex(open ? null : index);
                  }}
                  className="min-w-0 flex-1 cursor-pointer border-none bg-transparent text-left font-sans text-[12px] font-semibold leading-[1.3] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {itemLabelFor(
                    row,
                    descriptor.itemLabel,
                    descriptor.itemLabelFallback ?? 'Untitled',
                    index,
                  )}
                </button>
                {rowGaps > 0 ? (
                  <Pill tone="warn">
                    {rowGaps} {rowGaps === 1 ? 'gap' : 'gaps'}
                  </Pill>
                ) : (
                  <Pill tone="ok">complete</Pill>
                )}
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Move ${noun} ${String(index + 1)} up`}
                  onClick={() => {
                    move(index, index - 1);
                  }}
                  className="min-h-11 min-w-11 cursor-pointer rounded-field border-none bg-transparent text-ink3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40"
                >
                  <span aria-hidden="true">{'↑'}</span>
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Move ${noun} ${String(index + 1)} down`}
                  onClick={() => {
                    move(index, index + 1);
                  }}
                  className="min-h-11 min-w-11 cursor-pointer rounded-field border-none bg-transparent text-ink3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40"
                >
                  <span aria-hidden="true">{'↓'}</span>
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Remove ${noun} ${String(index + 1)}`}
                  onClick={() => {
                    writeRows(rows.filter((_, i) => i !== index));
                    setOpenIndex(null);
                  }}
                  className="min-h-11 min-w-11 cursor-pointer rounded-field border-none bg-transparent text-ink3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40"
                >
                  <span aria-hidden="true">{'×'}</span>
                </button>
              </div>

              {open ? (
                <div className="flex flex-col gap-[14px] border-t border-line p-[14px]">
                  <Fields
                    fields={descriptor.itemFields}
                    scope={row}
                    pathPrefix={`items[${String(index)}].`}
                    gaps={gaps}
                    refusedErrors={refusedErrors}
                    disabled={disabled}
                    onFieldChange={(key, value) => {
                      setItemField(index, key, value);
                    }}
                    onVisibilityChange={(key, visible) => {
                      setItemVisibility(index, key, visible);
                    }}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {descriptor.sectionFields && descriptor.sectionFields.length > 0 ? (
        <div className="flex flex-col gap-[14px] border-t border-line pt-[14px]">
          <Fields
            fields={descriptor.sectionFields}
            scope={record}
            pathPrefix=""
            gaps={gaps}
            refusedErrors={refusedErrors}
            disabled={disabled}
            onFieldChange={(key, value) => {
              onChange({ ...record, [key]: value });
            }}
            onVisibilityChange={(key, visible) => {
              const existing = record[key];
              const value = isRecord(existing) ? existing.value : undefined;
              onChange({ ...record, [key]: { value, visible } });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** How many of a row's fields currently carry a gap, for the collapsed pill. */
function countRowGaps(
  descriptor: CollectionSectionDescriptor,
  gaps: GapMap,
  index: number,
): number {
  return descriptor.itemFields.filter(
    (field) => gaps.at(`items[${String(index)}].${field.key}`).note !== undefined,
  ).length;
}
