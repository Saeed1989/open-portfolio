import type { ReactNode } from 'react';

export type HeadingSize = 'display' | 'cta' | 'heading' | 'title';

const sizes: Record<HeadingSize, string> = {
  display: 'text-display-sm md:text-display',
  cta: 'text-cta-sm md:text-cta',
  heading: 'text-heading-sm md:text-heading',
  title: 'text-body-lg',
};

interface HeadingProps {
  level: 1 | 2 | 3;
  size: HeadingSize;
  /**
   * Second line rendered in the accent gradient. Gradient text appears once on
   * the page — the hero headline — so only that heading should pass this.
   */
  accent?: string;
  id?: string;
  /** Layout classes only. */
  className?: string;
  children: ReactNode;
}

export function Heading({ level, size, accent, id, className, children }: HeadingProps) {
  const Tag = `h${level}` as const;
  const classes = [sizes[size], 'font-semibold text-pretty text-text', className]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag id={id} className={classes}>
      {children}
      {accent !== undefined && (
        <span className="block bg-linear-105 from-accent-from to-accent-to bg-clip-text text-transparent">
          {accent}
        </span>
      )}
    </Tag>
  );
}
