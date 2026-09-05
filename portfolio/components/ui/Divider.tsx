import { cn } from './cn';

/**
 * The hairline the design draws between sections and above a card's disclosure.
 *
 * `decorative` (the default) hides it from assistive technology, since a rule
 * between two already-labelled sections adds nothing when read aloud.
 */
export interface DividerProps {
  decorative?: boolean;
  className?: string;
}

export function Divider({ decorative = true, className }: DividerProps) {
  return (
    <hr
      aria-hidden={decorative ? 'true' : undefined}
      className={cn('w-full m-0 border-0 border-t border-border', className)}
    />
  );
}
