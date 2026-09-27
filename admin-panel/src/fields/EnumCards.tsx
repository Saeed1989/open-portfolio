import { describedBy, isInvalid, type Gap } from '../ui/field-chrome';
import { ErrorMessage, GapNote, Hint, Pill } from '../ui/primitives';

/**
 * A single choice from a small set, drawn as cards rather than a select, for
 * enums where each value needs a sentence of its own.
 *
 * A radiogroup rather than a listbox: the choice is committed on selection and
 * every option is visible, which is what `role="radio"` describes.
 */
export interface EnumCardOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  /** Drawn as a neutral pill and made unselectable. */
  readonly unavailableNote?: string;
}

export interface EnumCardsProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly options: readonly EnumCardOption[];
  readonly onChange?: ((value: string) => void) | undefined;
  readonly columns?: 2 | 3;
  readonly required?: boolean | undefined;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly gap?: Gap | undefined;
  readonly gapNote?: string | undefined;
  readonly demoFocus?: boolean | undefined;
}

export function EnumCards({
  id,
  label,
  value,
  options,
  onChange,
  columns = 3,
  required,
  hint,
  error,
  disabled,
  gap = 'none',
  gapNote,
  demoFocus,
}: EnumCardsProps) {
  const invalid = isInvalid({ disabled, error, gap });
  const message = error ?? (gap === 'blocking' ? gapNote : undefined);
  const showGapNote = gap === 'pending' && Boolean(gapNote);

  return (
    <div>
      <span
        id={`${id}-label`}
        className="mb-[6px] flex items-center gap-[6px] font-sans text-[12px] font-medium leading-[1.2] text-ink"
      >
        {label}
        {required ? (
          <span className="font-semibold text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      <div
        role="radiogroup"
        id={id}
        aria-labelledby={`${id}-label`}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy(id, {
          hint: Boolean(hint),
          gapNote: showGapNote,
          error: Boolean(message),
        })}
        className={`grid gap-[10px] ${columns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
      >
        {options.map((option, index) => {
          const selected = option.value === value;
          const unavailable = Boolean(option.unavailableNote);
          const inert = Boolean(disabled) || unavailable;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={inert}
              /* Roving tabstop: a radiogroup is one tabstop and the arrow keys
                 move within it, which is the browser's own behaviour for
                 radios and has to be reproduced when they are buttons. */
              tabIndex={selected || (value === '' && index === 0) ? 0 : -1}
              onClick={() => onChange?.(option.value)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowDown') {
                  return;
                }
                event.preventDefault();
                const next = options[(index + 1) % options.length];
                if (next && !next.unavailableNote) onChange?.(next.value);
              }}
              className={[
                'flex cursor-pointer flex-col items-start gap-[6px] rounded-card border p-[11px] text-left',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                selected
                  ? 'border-accent-line bg-accent-soft'
                  : invalid
                    ? 'border-danger bg-danger-soft'
                    : gap === 'pending'
                      ? 'border-dashed border-line-strong bg-surface'
                      : 'border-line bg-surface',
                unavailable ? 'cursor-not-allowed border-dashed bg-surface2' : '',
                disabled ? 'cursor-not-allowed bg-surface2 text-ink3' : '',
                demoFocus && index === 0
                  ? 'outline-2 outline-offset-2 outline-accent'
                  : '',
              ].join(' ')}
            >
              <span
                className={`font-sans text-[12px] font-semibold leading-[1.3] ${
                  selected ? 'text-accent' : inert ? 'text-ink3' : 'text-ink'
                }`}
              >
                {option.label}
              </span>
              {option.description ? (
                <span className="font-sans text-[11.5px] leading-[1.45] text-ink2">
                  {option.description}
                </span>
              ) : null}
              {option.unavailableNote ? (
                <Pill tone="neutral">{option.unavailableNote}</Pill>
              ) : null}
            </button>
          );
        })}
      </div>
      {hint ? <Hint id={`${id}-hint`}>{hint}</Hint> : null}
      {showGapNote ? <GapNote id={`${id}-gap`}>{gapNote}</GapNote> : null}
      {message ? (
        <ErrorMessage id={`${id}-error`}>{message}</ErrorMessage>
      ) : null}
    </div>
  );
}
