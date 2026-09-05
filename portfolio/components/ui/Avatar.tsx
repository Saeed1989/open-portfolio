import { cn } from './cn';

/**
 * The circular portrait in the hero.
 *
 * With no `src` it renders the design's bordered placeholder rather than a
 * broken image or a blank box. Omitting the avatar entirely is the caller's
 * decision — the hero reflows around its absence (FR-SEC-HERO-3), so this
 * primitive never renders "nothing".
 */
export type AvatarSize = 'fluid' | 'fixed';

export interface AvatarProps {
  src?: string;
  /** Required whenever `src` is set — an avatar is never decorative. */
  alt?: string;
  /** Shown in place of an image. Defaults to the design's placeholder text. */
  placeholder?: string;
  size?: AvatarSize;
  className?: string;
}

const SIZE: Record<AvatarSize, string> = {
  fluid: 'w-avatar',
  fixed: 'w-icon-lg',
};

export function Avatar({
  src,
  alt,
  placeholder = 'Photo placeholder',
  size = 'fluid',
  className,
}: AvatarProps) {
  const frame = cn(
    'shrink-0 aspect-square rounded-full overflow-hidden border border-border bg-surface',
    SIZE[size],
    className,
  );

  if (src) {
    return (
      <span className={frame}>
        <img
          src={src}
          alt={alt ?? ''}
          className="block w-full h-full object-cover"
        />
      </span>
    );
  }

  return (
    <span className={cn(frame, 'flex items-center justify-center text-center')}>
      <span className="px-14 font-display text-eyebrow font-medium leading-tight tracking-wide uppercase text-text-muted">
        {placeholder}
      </span>
    </span>
  );
}
