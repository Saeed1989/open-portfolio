import type { ReactNode } from 'react';

export type SectionTone = 'plain' | 'band' | 'hero' | 'cta';

// hero and cta carry the background layers defined in globals.css
const tones: Record<SectionTone, string> = {
  plain: 'bg-bg border-t border-border-subtle',
  band: 'bg-bg-band border-t border-border-subtle',
  hero: 'field-hero',
  cta: 'field-cta border-t border-border-subtle',
};

interface SectionShellProps {
  as?: 'section' | 'header' | 'footer' | 'div';
  tone?: SectionTone;
  id?: string;
  labelledBy?: string;
  /** Drop the default vertical padding. */
  flush?: boolean;
  /** Layout classes for the inner container only. */
  className?: string;
  children: ReactNode;
}

export function SectionShell({
  as: Tag = 'section',
  tone = 'plain',
  id,
  labelledBy,
  flush = false,
  className,
  children,
}: SectionShellProps) {
  const inner = ['mx-auto max-w-300 px-5 md:px-10', !flush && 'py-8 md:py-18', className]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag id={id} aria-labelledby={labelledBy} className={tones[tone]}>
      <div className={inner}>{children}</div>
    </Tag>
  );
}
