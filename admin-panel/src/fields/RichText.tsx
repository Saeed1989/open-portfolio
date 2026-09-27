import { useRef } from 'react';
import {
  controlClass,
  describedBy,
  HIT_AREA,
  isInvalid,
  type Gap,
} from '../ui/field-chrome';
import { ErrorMessage, GapNote, Hint, Label } from '../ui/primitives';

/**
 * Rich text, six controls (D10): bold, italic, underline, bulleted, numbered,
 * clear formatting.
 *
 * The toolbar is exactly the allowlist of FR-SEC-PROJ-12 minus the tags no
 * control produces — paragraph and line break come from typing. Offering a
 * seventh control would offer a mark the sanitiser strips at write time, so
 * the tenant would watch their formatting disappear on save.
 *
 * What is typed here is *not* trusted. The sanitiser is server-side, at write
 * time, from the single constant the registry exports (FR-SEC-PROJ-12,
 * NFR-SEC-2); this editor only avoids producing marks that would be stripped.
 */
export interface RichTextProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange?: ((html: string) => void) | undefined;
  readonly placeholder?: string | undefined;
  readonly required?: boolean | undefined;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly gap?: Gap | undefined;
  readonly gapNote?: string | undefined;
  readonly demoFocus?: boolean | undefined;
  /** Reference matrix only: draws a control in its pressed state. */
  readonly demoActive?: RichTextCommand | undefined;
}

type RichTextCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'removeFormat';

const CONTROLS: ReadonlyArray<{
  readonly command: RichTextCommand;
  readonly label: string;
  readonly glyph: string;
  readonly style?: string;
}> = [
  { command: 'bold', label: 'Bold', glyph: 'B', style: 'font-bold' },
  { command: 'italic', label: 'Italic', glyph: 'I', style: 'italic' },
  { command: 'underline', label: 'Underline', glyph: 'U', style: 'underline' },
  { command: 'insertUnorderedList', label: 'Bulleted list', glyph: '•' },
  { command: 'insertOrderedList', label: 'Numbered list', glyph: '1.' },
  { command: 'removeFormat', label: 'Clear formatting', glyph: '⌧' },
];

export function RichText({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  hint,
  error,
  disabled,
  gap = 'none',
  gapNote,
  demoFocus,
  demoActive,
}: RichTextProps) {
  const body = useRef<HTMLDivElement>(null);
  const chrome = { disabled, error, gap, demoFocus };
  const invalid = isInvalid(chrome);
  const message = error ?? (gap === 'blocking' ? gapNote : undefined);
  const showGapNote = gap === 'pending' && Boolean(gapNote);

  const run = (command: RichTextCommand) => {
    const element = body.current;
    if (!element) return;
    element.focus();
    /* execCommand is deprecated, and has no replacement that six controls
       justify writing by hand. The alternative is a document model and a
       selection API of our own, which is a library rather than a field.
       Wrapped because jsdom declares it and then throws — the a11y suite
       runs there. */
    try {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      document.execCommand(command);
    } catch {
      return;
    }
    onChange?.(element.innerHTML);
  };

  return (
    <div>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div className={controlClass(chrome, 'p-0 overflow-hidden')}>
        <div
          role="toolbar"
          aria-label={`${label} formatting`}
          aria-controls={id}
          className="flex items-center gap-[2px] border-b border-line bg-surface2 px-[6px] py-[5px]"
        >
          {CONTROLS.map((control, index) => (
            <button
              key={control.command}
              type="button"
              disabled={disabled}
              aria-label={control.label}
              aria-pressed={
                control.command === 'removeFormat'
                  ? undefined
                  : demoActive === control.command
              }
              /* One tabstop for the toolbar, arrows within it, per the
                 toolbar pattern — otherwise six controls sit between the
                 label and the text the tenant is trying to reach. */
              tabIndex={index === 0 ? 0 : -1}
              onClick={() => {
                run(control.command);
              }}
              className={[
                /* The mock's .rtb box, 26x24. HIT_AREA supplies the 44x44
                   target around it without widening the bar. */
                HIT_AREA,
                'h-[24px] w-[26px] cursor-pointer rounded-[4px] border bg-transparent font-sans text-[12px] leading-none',
                demoActive === control.command
                  ? 'border-accent-line bg-accent-soft text-accent'
                  : 'border-transparent text-ink2 hover:bg-tag-bg',
                'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
                'disabled:cursor-not-allowed disabled:opacity-40',
                control.style ?? '',
              ].join(' ')}
            >
              <span aria-hidden="true">{control.glyph}</span>
            </button>
          ))}
        </div>
        <div
          id={id}
          ref={body}
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy(id, {
            hint: Boolean(hint),
            gapNote: showGapNote,
            error: Boolean(message),
          })}
          contentEditable={!disabled}
          suppressContentEditableWarning
          tabIndex={0}
          onInput={(event) => onChange?.(event.currentTarget.innerHTML)}
          data-placeholder={placeholder}
          className={[
            'min-h-[72px] bg-field px-[12px] py-[11px] font-sans text-[12.5px] leading-[1.65] text-ink',
            'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
            disabled ? 'cursor-not-allowed bg-surface2 text-ink3' : '',
            'empty:before:text-ink3 empty:before:content-[attr(data-placeholder)]',
          ].join(' ')}
          dangerouslySetInnerHTML={{ __html: value }}
        />
      </div>
      {hint ? <Hint id={`${id}-hint`}>{hint}</Hint> : null}
      {showGapNote ? <GapNote id={`${id}-gap`}>{gapNote}</GapNote> : null}
      {message ? (
        <ErrorMessage id={`${id}-error`}>{message}</ErrorMessage>
      ) : null}
    </div>
  );
}
