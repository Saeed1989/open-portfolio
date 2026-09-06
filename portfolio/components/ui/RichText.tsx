import { cn } from './cn';

/**
 * Renders stored HTML.
 *
 * This is the only component in the app that injects markup it did not author,
 * and it is safe **only** because of what is supposed to have happened before
 * the string arrived: FR-SEC-PROJ-12 requires an allowlist sanitiser to run at
 * write time, so storage never holds anything but paragraphs, lists, `strong`,
 * `em`, `u` and `br`, with no attributes on any of them.
 *
 * That sanitiser belongs to the write path — the api — which does not exist in
 * this repository yet. Nothing here re-checks the string, by design: sanitising
 * on render would make the render path the security boundary, which is
 * precisely the arrangement FR-SEC-PROJ-12 rules out. The consequence is worth
 * stating plainly rather than burying: until the api sanitises on write, this
 * component will render whatever it is given, so it must not be pointed at a
 * source that has not been through that step.
 *
 * Styling is by element, in globals.css under `.rich-text` — the tags come
 * from storage and cannot carry a class.
 */
export interface RichTextProps {
  /** Sanitised at write time. See above. */
  html: string;
  /** Caps the measure. Body copy in the design is capped at 76ch. */
  measure?: 'prose' | 'none';
  className?: string;
}

const MEASURE = {
  prose: 'max-w-prose',
  none: '',
} as const;

export function RichText({ html, measure = 'prose', className }: RichTextProps) {
  return (
    <div
      className={cn(
        'rich-text min-w-0 break-words font-sans text-body font-regular leading-loose text-text text-pretty',
        MEASURE[measure],
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
