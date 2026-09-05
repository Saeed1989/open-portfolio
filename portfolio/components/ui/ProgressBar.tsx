import { cn } from './cn';

/**
 * The skill efficiency bar, at the design's two sizes.
 *
 * Accessibility (NFR-A11Y-3): the bar is a `progressbar` with an accessible
 * name and a numeric value, so its value is never carried by length or colour
 * alone. The design marked these up as role="img" with an aria-label; this
 * uses role="progressbar" with aria-valuenow instead, which conveys the same
 * information in a form assistive technology can report as a value. Callers
 * are still expected to render the rating as visible text alongside.
 *
 * The fill width is an inline style because it is data — a value from content,
 * not a design token. Everything else resolves to a token class.
 */
export type ProgressBarSize = 'lg' | 'sm';

const TRACK: Record<ProgressBarSize, string> = {
  lg: 'h-bar-lg',
  sm: 'h-bar-sm',
};

export interface ProgressBarProps {
  /** Current value, clamped into [min, max]. */
  value: number;
  min?: number;
  max?: number;
  /** Accessible name, e.g. the skill it measures. Required. */
  label: string;
  /** Spoken form of the value, e.g. "8 out of 10". */
  valueText?: string;
  size?: ProgressBarSize;
  className?: string;
}

export function ProgressBar({
  value,
  min = 0,
  max = 10,
  label,
  valueText,
  size = 'lg',
  className,
}: ProgressBarProps) {
  const span = max - min;
  const clamped = Math.min(Math.max(value, min), max);
  const percent = span > 0 ? ((clamped - min) / span) * 100 : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={valueText}
      className={cn(
        'w-full overflow-hidden rounded-pill bg-track',
        TRACK[size],
        className,
      )}
    >
      <div
        className="h-full rounded-pill bg-accent"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
