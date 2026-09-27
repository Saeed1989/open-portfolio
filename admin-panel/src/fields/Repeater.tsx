import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { HIT_AREA, isInvalid, type Gap } from '../ui/field-chrome';
import { Button, ErrorMessage, GapNote, Hint } from '../ui/primitives';

/**
 * An ordered list of items: drag handle, add, remove.
 *
 * Order is the field's value, not a presentation detail — FR-CFG-3 and
 * FR-SEC-SKILL-9 both persist it, and FR-REG-2 renders collection items in it.
 *
 * Drag is not the only way to reorder. A pointer gesture is unusable from a
 * keyboard, so the handle is a button that also moves its item with the arrow
 * keys, and each move is announced (NFR-A11Y-2, NFR-A11Y-5). Reordering that
 * only works with a mouse is a field that only works with a mouse.
 */
export interface RepeaterProps<T> {
  readonly id: string;
  readonly label: string;
  readonly items: readonly T[];
  readonly itemKey: (item: T, index: number) => string;
  readonly renderItem: (item: T, index: number) => ReactNode;
  /** The item's name in announcements and control labels. */
  readonly itemLabel: (item: T, index: number) => string;
  readonly onChange?: ((items: readonly T[]) => void) | undefined;
  readonly onAdd?: (() => void) | undefined;
  readonly addLabel?: string | undefined;
  /** Set when the collection is at its `max` (FR-SEC-PROJ-2 refuses at save,
   *  so the refusal belongs on the Add control rather than after authoring). */
  readonly addDisabledReason?: string | undefined;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly gap?: Gap | undefined;
  readonly gapNote?: string | undefined;
  readonly emptyNote?: string | undefined;
}

export function Repeater<T>({
  id,
  label,
  items,
  itemKey,
  renderItem,
  itemLabel,
  onChange,
  onAdd,
  addLabel = 'Add item',
  addDisabledReason,
  hint,
  error,
  disabled,
  gap = 'none',
  gapNote,
  emptyNote,
}: RepeaterProps<T>) {
  const dragFrom = useRef<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const invalid = isInvalid({ disabled, error, gap });
  const message = error ?? (gap === 'blocking' ? gapNote : undefined);
  const showGapNote = gap === 'pending' && Boolean(gapNote);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (moved === undefined) return;
    next.splice(to, 0, moved);
    onChange?.(next);
    setAnnouncement(
      `${itemLabel(moved, to)} moved to position ${String(to + 1)} of ${String(next.length)}`,
    );
  };

  return (
    <div>
      <div className="mb-[6px] flex items-center justify-between gap-[12px]">
        <span
          id={`${id}-label`}
          className="font-sans text-[12px] font-medium leading-[1.2] text-ink"
        >
          {label}
        </span>
        <Button
          sm
          onClick={onAdd}
          disabled={disabled || Boolean(addDisabledReason)}
          title={addDisabledReason}
          aria-describedby={addDisabledReason ? `${id}-add-note` : undefined}
        >
          + {addLabel}
        </Button>
      </div>

      <ol
        aria-labelledby={`${id}-label`}
        aria-invalid={invalid || undefined}
        className="flex flex-col gap-[8px]"
      >
        {items.map((item, index) => (
          <li
            key={itemKey(item, index)}
            draggable={!disabled}
            onDragStart={() => {
              dragFrom.current = index;
            }}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (dragFrom.current !== null) move(dragFrom.current, index);
              dragFrom.current = null;
            }}
            className={`flex items-start gap-[10px] rounded-card border p-[11px] ${
              invalid ? 'border-danger bg-danger-soft' : 'border-line bg-surface'
            } ${gap === 'pending' && !invalid ? 'border-dashed border-line-strong' : ''}`}
          >
            <button
              type="button"
              disabled={disabled}
              aria-label={`Reorder ${itemLabel(item, index)}, position ${String(index + 1)} of ${String(items.length)}. Use the arrow keys to move it.`}
              onKeyDown={(event) => {
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  move(index, index - 1);
                } else if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  move(index, index + 1);
                }
              }}
              className={`${HIT_AREA} cursor-grab rounded-field font-mono text-[12px] leading-none tracking-[-1px] text-ink3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <span aria-hidden="true">{'⋮⋮'}</span>
            </button>

            <div className="min-w-0 flex-1">{renderItem(item, index)}</div>

            <button
              type="button"
              disabled={disabled}
              aria-label={`Remove ${itemLabel(item, index)}`}
              onClick={() => onChange?.(items.filter((_, i) => i !== index))}
              className={`${HIT_AREA} rounded-field text-ink3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </li>
        ))}
      </ol>

      {items.length === 0 && emptyNote ? (
        <p className="rounded-card border border-dashed border-line-strong bg-surface2 px-[12px] py-[14px] text-center font-sans text-[11.5px] leading-[1.45] text-ink3">
          {emptyNote}
        </p>
      ) : null}

      {/* Drag has no accessible equivalent to announce itself, so the moves
          made by either route are reported here. */}
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>

      {addDisabledReason ? (
        <Hint id={`${id}-add-note`}>{addDisabledReason}</Hint>
      ) : null}
      {hint ? <Hint id={`${id}-hint`}>{hint}</Hint> : null}
      {showGapNote ? <GapNote id={`${id}-gap`}>{gapNote}</GapNote> : null}
      {message ? (
        <ErrorMessage id={`${id}-error`}>{message}</ErrorMessage>
      ) : null}
    </div>
  );
}
