import { useState } from 'react';
import { Tag } from '../ui/primitives';
import { FieldShell, type FieldBaseProps } from './FieldShell';

/**
 * Chips with an add input and per-chip removal.
 *
 * The suggestion source is a prop rather than a lookup: this component is
 * section-agnostic, and a tech-stack suggestion list and a skill-category list
 * differ only in what is passed in.
 */
export interface TagListProps extends FieldBaseProps {
  readonly value: readonly string[];
  readonly onChange?: ((value: readonly string[]) => void) | undefined;
  readonly placeholder?: string | undefined;
  /** Offered beneath the input; already-chosen values are filtered out. */
  readonly suggestions?: readonly string[] | undefined;
}

export function TagList({
  value,
  onChange,
  placeholder,
  suggestions,
  ...base
}: TagListProps) {
  const [entry, setEntry] = useState('');

  const add = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed === '' || value.includes(trimmed)) return;
    onChange?.([...value, trimmed]);
    setEntry('');
  };

  const remaining = (suggestions ?? []).filter((s) => !value.includes(s));

  return (
    <FieldShell {...base} controlExtra="flex flex-col gap-[8px]">
      {(control) => (
        <div className={control.className}>
          {value.length > 0 ? (
            <div className="flex flex-wrap gap-[6px]">
              {value.map((tag) => (
                <Tag
                  key={tag}
                  disabled={control.disabled}
                  removeLabel={`Remove ${tag}`}
                  onRemove={
                    control.disabled
                      ? undefined
                      : () => {
                          onChange?.(value.filter((t) => t !== tag));
                        }
                  }
                >
                  {tag}
                </Tag>
              ))}
            </div>
          ) : null}
          <input
            id={control.id}
            type="text"
            className="w-full bg-transparent font-sans text-[13px] leading-[1.35] text-ink outline-none placeholder:text-ink3 disabled:cursor-not-allowed"
            value={entry}
            placeholder={placeholder}
            disabled={control.disabled}
            aria-invalid={control.invalid || undefined}
            aria-describedby={control.describedBy}
            onChange={(event) => {
              setEntry(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              add(entry);
            }}
          />
          {remaining.length > 0 && !control.disabled ? (
            <div className="flex flex-wrap items-center gap-[6px] border-t border-line pt-[8px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink3">
                Suggested
              </span>
              {remaining.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    add(suggestion);
                  }}
                  className="rounded-[4px] border border-dashed border-line-strong px-[8px] py-[4px] font-sans text-[11.5px] font-medium leading-none text-ink2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </FieldShell>
  );
}
