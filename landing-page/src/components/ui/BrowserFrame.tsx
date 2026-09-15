import type { ReactNode } from 'react';

export type BrowserFrameTone = 'dark' | 'light';
export type BrowserFrameSize = 'sm' | 'md';

const tones: Record<BrowserFrameTone, { frame: string; chrome: string; url: string; slug: string }> = {
  dark: {
    frame: 'bg-bg-sunken shadow-lift-2',
    chrome: 'bg-linear-135 from-raised-from to-raised-to border-b border-border-subtle',
    url: 'rounded-sm bg-bg px-2.5 text-text-muted',
    slug: 'text-accent-ink',
  },
  light: {
    frame: 'bg-light-bg ring-1 ring-border-strong shadow-lift-1',
    chrome: 'bg-light-chrome',
    url: 'text-light-text-muted',
    slug: '',
  },
};

const sizes: Record<BrowserFrameSize, { frame: string; chrome: string; url: string }> = {
  sm: { frame: 'rounded-lg', chrome: 'h-7 gap-2 px-2.5', url: 'h-5 text-micro' },
  md: { frame: 'rounded-xl', chrome: 'h-10 gap-3.5 px-3.5', url: 'h-6 text-small' },
};

interface BrowserFrameProps {
  /** Highlighted subdomain in the address bar. */
  slug: string;
  /** Rest of the host, e.g. ".openfolio.com". */
  host: string;
  /** The frame is illustrative, so it is exposed as one image with this name. */
  label: string;
  tone?: BrowserFrameTone;
  size?: BrowserFrameSize;
  /** Layout classes only. */
  className?: string;
  children: ReactNode;
}

export function BrowserFrame({
  slug,
  host,
  label,
  tone = 'dark',
  size = 'md',
  className,
  children,
}: BrowserFrameProps) {
  const t = tones[tone];
  const s = sizes[size];

  return (
    <figure
      role="img"
      aria-label={label}
      className={['overflow-hidden', t.frame, s.frame, className].filter(Boolean).join(' ')}
    >
      <div className={['flex items-center', t.chrome, s.chrome].join(' ')}>
        {tone === 'dark' && (
          <div aria-hidden="true" className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-border-strong" />
            <span className="size-2.5 rounded-full bg-border-strong" />
            <span className="size-2.5 rounded-full bg-border-strong" />
          </div>
        )}
        <div
          className={['flex min-w-0 flex-1 items-center truncate font-mono', t.url, s.url].join(
            ' ',
          )}
        >
          <span className={t.slug}>{slug}</span>
          {host}
        </div>
      </div>
      {children}
    </figure>
  );
}
