export type IconName = 'check' | 'spinner';

interface IconProps {
  name: IconName;
  size?: 'sm' | 'md';
  /** Omit for decorative icons; they are hidden from assistive technology. */
  label?: string;
  /** Layout and text-colour classes; strokes use currentColor. */
  className?: string;
}

export function Icon({ name, size = 'md', label, className }: IconProps) {
  const a11y = label
    ? { role: 'img' as const, 'aria-label': label }
    : { 'aria-hidden': true as const };
  const classes = [
    size === 'sm' ? 'size-3.5' : 'size-4',
    'shrink-0',
    name === 'spinner' && 'motion-safe:animate-spin',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg viewBox="0 0 16 16" fill="none" className={classes} {...a11y}>
      {name === 'check' && (
        <path
          d="M3 8.5 6.5 12 13 4.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {name === 'spinner' && (
        <>
          <circle cx="8" cy="8" r="6" strokeWidth="2" className="stroke-border-strong" />
          <path
            d="M8 2a6 6 0 0 1 6 6"
            strokeWidth="2"
            strokeLinecap="round"
            className="stroke-accent-from"
          />
        </>
      )}
    </svg>
  );
}
