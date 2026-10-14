import { cn } from './cn';

/**
 * Renders stored HTML. The only component that injects markup it did not
 * author, and safe only because the write path sanitises against the
 * allowlist: storage holds nothing but paragraphs, lists, `strong`, `em`, `u`
 * and `br`, with no attributes. Nothing here re-checks the string, by design,
 * so it must not be pointed at an unsanitised source.
 *
 * Styling is by element, in globals.css under `.rich-text`.
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
