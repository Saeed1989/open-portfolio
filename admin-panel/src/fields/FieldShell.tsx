import type { ReactNode } from 'react';
import {
  controlClass,
  describedBy,
  isInvalid,
  type FieldChromeInput,
  type Gap,
} from '../ui/field-chrome';
import { ErrorMessage, GapNote, Hint, Label } from '../ui/primitives';

/*
 * The props every one of the eleven field components accepts, and the layout
 * every one of them renders. Label, control, hint, gap note and error appear
 * in the same order and the same slots in all eleven, which is what lets the
 * reference matrix read as columns rather than eleven separate designs.
 */
export interface FieldBaseProps {
  readonly id: string;
  readonly label: string;
  /** Required *for publish* (FR-REG-8). Draws the asterisk. */
  readonly required?: boolean | undefined;
  readonly optional?: boolean | undefined;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly gap?: Gap | undefined;
  /** What the gap is. Grey while `pending`, the error message once blocking. */
  readonly gapNote?: string | undefined;
  /** Reference matrix only — see `FieldChromeInput.demoFocus`. */
  readonly demoFocus?: boolean | undefined;
}

interface ControlArgs {
  readonly id: string;
  readonly className: string;
  readonly invalid: boolean;
  readonly describedBy: string | undefined;
  readonly disabled: boolean;
}

export interface FieldShellProps extends FieldBaseProps {
  /** Extra classes for the control box, for fields that are not one input. */
  readonly controlExtra?: string | undefined;
  readonly children: (args: ControlArgs) => ReactNode;
}

export function FieldShell({
  id,
  label,
  required,
  optional,
  hint,
  error,
  disabled,
  gap = 'none',
  gapNote,
  demoFocus,
  controlExtra,
  children,
}: FieldShellProps) {
  const chrome: FieldChromeInput = { disabled, error, gap, demoFocus };
  const invalid = isInvalid(chrome);

  /* A blocking gap with no validation error of its own still needs something
     in the error slot, and the gap note is already the sentence that says what
     is missing. One message, whichever name it arrives under. */
  const message = error ?? (gap === 'blocking' ? gapNote : undefined);
  const showGapNote = gap === 'pending' && Boolean(gapNote);

  return (
    <div>
      <Label htmlFor={id} required={required} optional={optional}>
        {label}
      </Label>
      {children({
        id,
        className: controlClass(chrome, controlExtra),
        invalid,
        describedBy: describedBy(id, {
          hint: Boolean(hint),
          gapNote: showGapNote,
          error: Boolean(message),
        }),
        disabled: Boolean(disabled),
      })}
      {hint ? <Hint id={`${id}-hint`}>{hint}</Hint> : null}
      {showGapNote ? <GapNote id={`${id}-gap`}>{gapNote}</GapNote> : null}
      {message ? <ErrorMessage id={`${id}-error`}>{message}</ErrorMessage> : null}
    </div>
  );
}
