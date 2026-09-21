import {
  describedBy,
  HIT_AREA,
  isInvalid,
  type Gap,
} from '../ui/field-chrome';
import { ErrorMessage, GapNote, Hint } from '../ui/primitives';

/*
 * A switch is the one field with no box to put a border on, so it does not go
 * through FieldShell's control slot. It keeps the same label / hint / gap /
 * error order, and the same one focus ring.
 *
 * It is a `button` with `role="switch"`, not a checkbox: the state is applied
 * immediately rather than on submit, and `aria-checked` is what says so.
 */
export interface SwitchProps {
  readonly id: string;
  readonly label: string;
  readonly checked: boolean;
  readonly onChange?: ((checked: boolean) => void) | undefined;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly gap?: Gap | undefined;
  readonly gapNote?: string | undefined;
  readonly demoFocus?: boolean | undefined;
}

export function Switch({
  id,
  label,
  checked,
  onChange,
  hint,
  error,
  disabled,
  gap = 'none',
  gapNote,
  demoFocus,
}: SwitchProps) {
  const invalid = isInvalid({ disabled, error, gap });
  const message = error ?? (gap === 'blocking' ? gapNote : undefined);
  const showGapNote = gap === 'pending' && Boolean(gapNote);

  return (
    <div>
      <div className="flex items-center gap-[10px]">
        <button
          type="button"
          id={id}
          role="switch"
          aria-checked={checked}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy(id, {
            hint: Boolean(hint),
            gapNote: showGapNote,
            error: Boolean(message),
          })}
          disabled={disabled}
          onClick={() => onChange?.(!checked)}
          /* The track stays 34x20 as the mock draws it; HIT_AREA supplies the
             44x44 target around it without changing the row's height. */
          className={`${HIT_AREA} cursor-pointer rounded-field border-none bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <span
            aria-hidden="true"
            className={`relative block h-[20px] w-[34px] flex-none rounded-full ${
              checked ? 'bg-accent' : 'bg-line-strong'
            } ${demoFocus ? 'outline-2 outline-offset-2 outline-accent' : ''}`}
          >
            <span
              className={`absolute top-[2px] block h-[16px] w-[16px] rounded-full transition-[left] duration-150 ${
                checked ? 'left-[16px] bg-accent-ink' : 'left-[2px] bg-surface'
              }`}
            />
          </span>
        </button>
        <label
          htmlFor={id}
          className="font-sans text-[12px] font-medium leading-[1.2] text-ink"
        >
          {label}
        </label>
      </div>
      {hint ? <Hint id={`${id}-hint`}>{hint}</Hint> : null}
      {showGapNote ? <GapNote id={`${id}-gap`}>{gapNote}</GapNote> : null}
      {message ? <ErrorMessage id={`${id}-error`}>{message}</ErrorMessage> : null}
    </div>
  );
}
