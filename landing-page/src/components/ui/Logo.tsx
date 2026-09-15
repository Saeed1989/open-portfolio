interface LogoProps {
  href: string;
  /** Single letter in the accent tile; decorative. */
  mark: string;
  /** Wordmark; also the link's accessible name. */
  name: string;
}

export function Logo({ href, mark, name }: LogoProps) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink-strong"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-6 items-center justify-center rounded-sm bg-linear-135 from-accent-from to-accent-to text-small font-semibold text-on-accent inset-shadow-highlight-accent shadow-glow-pressed"
      >
        {mark}
      </span>
      <span className="text-body-lg font-semibold tracking-wordmark text-text">{name}</span>
    </a>
  );
}
