import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { adminApi } from '../api/client';
import { AdminError } from '../api/errors';
import type { AdminSection } from '../api/dto';
import {
  DESCRIPTORS,
  readiness,
  validateForPublish,
  type SectionDescriptor,
} from '../registry';
import { Switch } from '../fields/Switch';
import { Button, Card, Pill, type PillTone } from '../ui/primitives';

/*
 * Artboard 01 — the section manager.
 *
 * One row per section type: order, name, a content summary, the published
 * state, and the enable switch. Drag to reorder; the order here is the order
 * on the page (FR-CFG-3).
 *
 * Nothing here names a section type. Every column is derived from the
 * descriptor and the content: the summary from cardinality, the state from
 * `emptyCondition` and the publish validator. A section type added to the
 * registry appears here with no change to this file (FR-REG-3).
 *
 * The mock's rejected alternative is worth keeping in view: a three-way
 * segmented control per row (off / draft / live) "reads as a workflow the
 * product does not have; enabled is one bit and emptiness is a fact about the
 * content". So: a switch for the bit, and a pill for the fact.
 */

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

/** The three states the mock draws, and what each one means. */
type SectionState = 'appears' | 'enabled-empty' | 'off';

interface Row {
  readonly descriptor: SectionDescriptor;
  readonly section: AdminSection;
  readonly state: SectionState;
  readonly gaps: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sectionsOf(portfolio: unknown): readonly AdminSection[] {
  if (!isRecord(portfolio)) return [];
  const draft = portfolio.draft;
  if (!isRecord(draft) || !Array.isArray(draft.sections)) return [];
  return (draft.sections as unknown[]).filter(
    (entry): entry is AdminSection => isRecord(entry) && typeof entry.type === 'string',
  );
}

/**
 * A row's content summary.
 *
 * Derived from cardinality rather than written per section: a collection
 * counts its items, a single section reports how filled in it is. The mock
 * writes these by hand ("4 projects · 1 confidential"), which no generic
 * screen can reproduce without knowing what a project is.
 */
function summarise(descriptor: SectionDescriptor, section: AdminSection): string {
  const content = section.content;

  if (descriptor.cardinality === 'collection') {
    const items = isRecord(content) && Array.isArray(content.items) ? content.items : [];
    const noun = descriptor.itemNoun ?? 'item';
    const base =
      items.length === 0
        ? `No ${noun}s`
        : `${String(items.length)} ${items.length === 1 ? noun : `${noun}s`}`;
    /* "kept" is the mock's word, and it is the reassurance that matters on a
       disabled row: turning a section off does not delete anything. */
    return section.enabled || items.length === 0 ? base : `${base}, kept`;
  }

  const errors = validateForPublish(descriptor, content);
  const stats = readiness(descriptor, content, errors);
  const base = `${String(stats.filled)} of ${String(stats.total)} fields`;
  return section.enabled || stats.filled === 0 ? base : `${base}, kept`;
}

const STATE_LABEL: Record<SectionState, string> = {
  appears: 'Appears',
  'enabled-empty': 'Enabled · will not appear',
  off: 'Off — not published',
};

const STATE_TONE: Record<SectionState, PillTone> = {
  appears: 'ok',
  'enabled-empty': 'warn',
  off: 'neutral',
};

export function SectionManagerPage() {
  const [sections, setSections] = useState<readonly AdminSection[]>([]);
  const [version, setVersion] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<number | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | undefined>(undefined);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(undefined);
    adminApi
      .portfolio()
      .then((portfolio) => {
        setSections(sectionsOf(portfolio));
        setVersion(portfolio.version);
      })
      .catch((cause: unknown) => {
        setLoadError(cause instanceof AdminError ? cause.message : String(cause));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(load, [load]);

  /*
   * One write per changed section, in sequence.
   *
   * Sequential rather than parallel because every write increments the
   * document's `version` (§5.2) and each carries the previous one's result as
   * its `If-Match` (D3). Issued together they would race, and all but the
   * first would come back `409 stale_write`.
   */
  const persist = useCallback(
    async (changed: readonly AdminSection[], next: readonly AdminSection[]) => {
      const previous = sections;
      setSections(next);
      setStatus('saving');
      setSaveError(undefined);

      let at = version;
      try {
        for (const section of changed) {
          const result = await adminApi.updateSection(
            section.type,
            { enabled: section.enabled, order: section.order },
            at,
          );
          at = result.version;
        }
        setVersion(at);
        setStatus('saved');
        setSavedAt(Date.now());
      } catch (cause) {
        /* The write did not land, so the screen must not keep showing it as
           though it had. Rolling back is safe here in a way it is not in the
           editor: a toggle is one bit the tenant can simply set again, not
           prose they would have to retype. */
        setSections(previous);
        setStatus('failed');
        setSaveError(
          cause instanceof AdminError ? cause.message : 'The change was not saved.',
        );
      }
    },
    [sections, version],
  );

  const rows: readonly Row[] = useMemo(() => {
    /* Registry order is the default order (§4.1); a section the tenant has
       reordered carries its own. Sections the registry declares but the draft
       has never held still appear, so a new section type is visible the first
       time it exists. */
    const byType = new Map(sections.map((section) => [section.type, section]));

    return DESCRIPTORS.map((descriptor, index) => {
      const section: AdminSection = byType.get(descriptor.type) ?? {
        type: descriptor.type,
        enabled: false,
        order: index,
        content: {},
      };
      const empty = descriptor.emptyCondition(section.content);
      const gaps = validateForPublish(descriptor, section.content).length;
      const state: SectionState = !section.enabled
        ? 'off'
        : empty
          ? 'enabled-empty'
          : 'appears';
      return { descriptor, section, state, gaps };
    }).sort((a, b) => a.section.order - b.section.order);
  }, [sections]);

  const appearing = rows.filter((row) => row.state === 'appears').length;
  const enabledEmpty = rows.filter((row) => row.state === 'enabled-empty').length;
  const off = rows.filter((row) => row.state === 'off').length;

  const toggle = (row: Row) => {
    const next = sections.some((s) => s.type === row.section.type)
      ? sections.map((s) =>
          s.type === row.section.type ? { ...s, enabled: !s.enabled } : s,
        )
      : [...sections, { ...row.section, enabled: true }];
    const changed = next.find((s) => s.type === row.section.type);
    if (changed) void persist([changed], next);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length || from === to) return;

    const ordered = rows.map((row) => row.section);
    const [moved] = ordered.splice(from, 1);
    if (!moved) return;
    ordered.splice(to, 0, moved);

    /* Renumbered from zero so the stored order matches what is on screen and
       no gap accumulates after repeated moves. Only the rows whose number
       actually changed are written. */
    const renumbered = ordered.map((section, index) => ({ ...section, order: index }));
    const changed = renumbered.filter((section) => {
      const before = sections.find((s) => s.type === section.type);
      return before === undefined || before.order !== section.order;
    });
    void persist(changed, renumbered);
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex flex-wrap items-center justify-between gap-[12px] border-b border-line bg-surface px-[20px] py-[10px]">
        <div className="flex items-center gap-[7px] font-sans text-[12px] text-ink3">
          <span>Sections</span>
          <span>/</span>
          <b className="font-semibold text-ink">All sections</b>
        </div>
        <div role="status" aria-live="polite" className="flex items-center gap-[10px]">
          {status === 'saving' ? (
            <span className="font-mono text-[11px] text-ink2">Saving…</span>
          ) : status === 'saved' && savedAt !== undefined ? (
            <span className="font-mono text-[11px] text-ink2">
              Saved{' '}
              {new Date(savedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          ) : status === 'failed' ? (
            <>
              <Pill tone="danger">Not saved</Pill>
              <span className="font-sans text-[11.5px] text-ink2">{saveError}</span>
            </>
          ) : null}
        </div>
      </header>

      <main className="flex flex-col gap-[16px] p-[20px]">
        <div>
          <h1 className="m-0 font-sans text-[17px] font-semibold leading-[1.3] text-ink">
            Sections
          </h1>
          <p className="mt-[4px] font-sans text-[12px] leading-[1.5] text-ink2">
            Drag to reorder. Order here is the order on the page. A section with
            no content is left off entirely.
          </p>
        </div>

        {loading ? (
          <p className="font-mono text-[11px] text-ink3">Loading…</p>
        ) : loadError !== undefined ? (
          <Card className="flex items-center gap-[10px] p-[12px]">
            <Pill tone="danger">Could not load</Pill>
            <span className="font-sans text-[11.5px] text-ink2">{loadError}</span>
            <Button sm onClick={load}>
              Try again
            </Button>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-[8px]">
              <Pill tone="ok">{appearing} will appear</Pill>
              {enabledEmpty > 0 ? (
                <Pill tone="warn">{enabledEmpty} enabled, empty</Pill>
              ) : null}
              {off > 0 ? <Pill tone="neutral">{off} off</Pill> : null}
            </div>

            <Card>
              <div
                className="grid items-center gap-[12px] border-b border-line px-[14px] py-[9px] font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink3"
                style={{ gridTemplateColumns: '18px 26px 1fr 200px 190px 74px 16px' }}
              >
                <span />
                <span>#</span>
                <span>Section</span>
                <span>Content</span>
                <span>Published state</span>
                <span>Enabled</span>
                <span />
              </div>

              <ol className="m-0 list-none p-0">
                {rows.map((row, index) => (
                  <li
                    key={row.descriptor.type}
                    draggable
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
                    className="grid items-center gap-[12px] border-b border-line px-[14px] py-[10px] last:border-b-0"
                    style={{ gridTemplateColumns: '18px 26px 1fr 200px 190px 74px 16px' }}
                  >
                    {/* Drag is a pointer gesture and unusable from a keyboard,
                        so the handle is a button that also moves its row with
                        the arrow keys (NFR-A11Y-2). */}
                    <button
                      type="button"
                      aria-label={`Reorder ${row.descriptor.label}, position ${String(index + 1)} of ${String(rows.length)}. Use the arrow keys to move it.`}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowUp') {
                          event.preventDefault();
                          move(index, index - 1);
                        } else if (event.key === 'ArrowDown') {
                          event.preventDefault();
                          move(index, index + 1);
                        }
                      }}
                      className="cursor-grab border-none bg-transparent font-mono text-[12px] leading-none tracking-[-1px] text-ink3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <span aria-hidden="true">{'⋮⋮'}</span>
                    </button>

                    <span className="font-mono text-[10.5px] text-ink3">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <div className="min-w-0">
                      <div className="font-sans text-[12px] font-semibold leading-[1.3] text-ink">
                        {row.descriptor.label}
                      </div>
                      <div className="font-mono text-[10.5px] text-ink3">
                        {row.descriptor.cardinality}
                        {row.descriptor.cardinality === 'collection' &&
                        row.descriptor.max !== undefined
                          ? ` · max ${String(row.descriptor.max)}`
                          : ''}
                      </div>
                    </div>

                    <span className="font-sans text-[12px] leading-[1.45] text-ink2">
                      {summarise(row.descriptor, row.section)}
                    </span>

                    <span>
                      <Pill tone={STATE_TONE[row.state]}>
                        {STATE_LABEL[row.state]}
                        {row.state === 'appears' && row.gaps > 0
                          ? ` · ${String(row.gaps)} field ${row.gaps === 1 ? 'gap' : 'gaps'}`
                          : ''}
                      </Pill>
                    </span>

                    <Switch
                      id={`enabled-${row.descriptor.type}`}
                      label={`Enable ${row.descriptor.label}`}
                      labelHidden
                      checked={row.section.enabled}
                      disabled={status === 'saving'}
                      onChange={() => {
                        toggle(row);
                      }}
                    />

                    <Link
                      to={`/sections/${row.descriptor.type}`}
                      aria-label={`Edit ${row.descriptor.label}`}
                      className="text-ink3 no-underline"
                    >
                      <span aria-hidden="true">{'›'}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </Card>

            {/* FR-CFG-4: publishing requires at least one enabled, non-empty
                section. Stated as a running count rather than surfaced only as
                a publish failure. */}
            <Card className="flex flex-col gap-[4px] p-[12px]">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink3">
                Publish gate
              </span>
              <span
                className={`font-sans text-[11.5px] leading-[1.45] ${
                  appearing === 0 ? 'text-danger' : 'text-ink2'
                }`}
              >
                At least one enabled, non-empty section is required. Currently{' '}
                {appearing}.
              </span>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
