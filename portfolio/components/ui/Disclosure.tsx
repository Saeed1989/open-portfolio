import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * A native `<details>` disclosure.
 *
 * The design opens a project's "Solution and my role" this way, and
 * FR-SEC-EXP-1 asks for individually collapsible experience entries. Native
 * details/summary is deliberate: it is keyboard operable and announced
 * correctly with no JavaScript, which keeps every section a server component
 * and keeps the detail text in the initial HTML for crawlers (FR-PUB-4).
 *
 * The native marker is suppressed here and in globals.css, matching the
 * design, which draws no triangle.
 */
export interface DisclosureProps {
  /** The always-visible summary line. */
  summary: string;
  /** Draws the hairline the design puts above the disclosure. */
  divided?: boolean;
  defaultOpen?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Disclosure({
  summary,
  divided = true,
  defaultOpen = false,
  className,
  children,
}: DisclosureProps) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        'min-w-0',
        divided && 'border-t border-border pt-10',
        className,
      )}
    >
      <summary className="flex min-h-tap cursor-pointer list-none items-center font-sans text-compact font-medium leading-tight text-accent-ink">
        {summary}
      </summary>
      <div className="flex min-w-0 flex-col gap-10 pb-4">{children}</div>
    </details>
  );
}
