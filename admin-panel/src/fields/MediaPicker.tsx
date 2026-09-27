import {
  controlClass,
  describedBy,
  isInvalid,
  HIT_AREA,
  type Gap,
} from '../ui/field-chrome';
import { Button, ErrorMessage, GapNote, Hint, Label } from '../ui/primitives';

/**
 * An asset card with its alt text, as one field.
 *
 * Alt text is inside the picker rather than beside it because FR-MED-5 makes
 * it a condition of attaching the image at all — "an image cannot be attached
 * to content without it". A separate field could be left empty while the image
 * stayed; a sub-field of the picker cannot.
 *
 * This component selects an already-uploaded asset and edits its alt text. It
 * does not upload: FR-MED-1 puts the bytes on a signed URL straight to storage
 * and the API never proxies them, so the upload is a transport concern that
 * belongs beside the media routes, not in a field component.
 */
export interface MediaAsset {
  readonly id: string;
  readonly url: string;
  readonly fileName: string;
  readonly width: number;
  readonly height: number;
  readonly altText: string;
}

export interface MediaPickerProps {
  readonly id: string;
  readonly label: string;
  readonly value: MediaAsset | null;
  readonly onAltTextChange?: ((altText: string) => void) | undefined;
  readonly onChoose?: (() => void) | undefined;
  readonly onRemove?: (() => void) | undefined;
  readonly required?: boolean | undefined;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  /** A missing alt text on a present asset. Rendered in the alt slot. */
  readonly altError?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly gap?: Gap | undefined;
  readonly gapNote?: string | undefined;
  readonly demoFocus?: boolean | undefined;
}

export function MediaPicker({
  id,
  label,
  value,
  onAltTextChange,
  onChoose,
  onRemove,
  required,
  hint,
  error,
  altError,
  disabled,
  gap = 'none',
  gapNote,
  demoFocus,
}: MediaPickerProps) {
  const chrome = { disabled, error, gap, demoFocus };
  const invalid = isInvalid(chrome);
  const message = error ?? (gap === 'blocking' ? gapNote : undefined);
  const showGapNote = gap === 'pending' && Boolean(gapNote);
  const altId = `${id}-alt`;

  return (
    <div>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div
        className={controlClass(chrome, 'flex flex-col gap-[10px] p-[11px]')}
      >
        {value === null ? (
          <div className="flex items-center justify-between gap-[12px]">
            <span className="font-mono text-[11px] leading-[1.3] text-ink3">
              No image attached
            </span>
            <Button
              id={id}
              sm
              onClick={onChoose}
              disabled={disabled}
              aria-describedby={describedBy(id, {
                hint: Boolean(hint),
                gapNote: showGapNote,
                error: Boolean(message),
              })}
            >
              Choose image
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-[11px]">
              {/* Dimensions are on the element, not only in the caption:
                  NFR-PERF-2's layout-shift budget is spent by images that
                  arrive without them (FR-MED-6). */}
              <img
                src={value.url}
                alt={value.altText}
                width={value.width}
                height={value.height}
                className="h-[54px] w-[86px] flex-none rounded-field border border-line bg-surface2 object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="truncate font-sans text-[12px] font-semibold leading-[1.3] text-ink">
                  {value.fileName}
                </span>
                <span className="font-mono text-[10.5px] leading-[1.3] text-ink3">
                  {value.width} &times; {value.height}
                </span>
              </div>
              <button
                type="button"
                onClick={onRemove}
                disabled={disabled}
                aria-label={`Remove ${value.fileName}`}
                className={`${HIT_AREA} rounded-field text-ink3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="border-t border-line pt-[10px]">
              <Label htmlFor={altId} required>
                Alt text
              </Label>
              <input
                id={altId}
                type="text"
                className={controlClass({
                  disabled,
                  error: altError,
                  gap: 'none',
                })}
                value={value.altText}
                placeholder="What the image shows, for someone who cannot see it"
                disabled={disabled}
                aria-invalid={Boolean(altError) || undefined}
                aria-describedby={altError ? `${altId}-error` : undefined}
                onChange={(event) => onAltTextChange?.(event.target.value)}
              />
              {altError ? (
                <ErrorMessage id={`${altId}-error`}>{altError}</ErrorMessage>
              ) : null}
            </div>
          </>
        )}
      </div>
      {hint ? <Hint id={`${id}-hint`}>{hint}</Hint> : null}
      {showGapNote ? <GapNote id={`${id}-gap`}>{gapNote}</GapNote> : null}
      {message ? (
        <ErrorMessage id={`${id}-error`}>{message}</ErrorMessage>
      ) : null}
      {/* The invalid state has to reach assistive tech even when the control
          in the box is a button rather than an input. */}
      {invalid && value !== null ? (
        <span className="sr-only" role="status">
          {message}
        </span>
      ) : null}
    </div>
  );
}
