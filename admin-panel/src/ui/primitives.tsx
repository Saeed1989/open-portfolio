import type { ReactNode } from 'react';
import { HIT_AREA } from './field-chrome';

/*
 * The primitives the eleven field components are built from. Nothing here
 * knows what a section is; everything here is reused by every field.
 */

export interface LabelProps {
  readonly htmlFor: string;
  readonly children: ReactNode;
  /** Draws the asterisk. Required *for publish* — see `Gap`. */
  readonly required?: boolean | undefined;
  /** Draws the word, for a field whose absence is never a gap. */
  readonly optional?: boolean | undefined;
}

export function Label({ htmlFor, children, required, optional }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-[6px] flex items-center gap-[6px] font-sans text-[12px] font-medium leading-[1.2] text-ink"
    >
      {children}
      {required ? (
        <span className="font-semibold text-danger" aria-hidden="true">
          *
        </span>
      ) : null}
      {optional ? (
        <span className="font-mono text-[10.5px] font-normal text-ink3">
          optional
        </span>
      ) : null}
    </label>
  );
}

export function Hint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p
      id={id}
      className="mt-[5px] font-sans text-[11.5px] leading-[1.45] text-ink3"
    >
      {children}
    </p>
  );
}

/**
 * The one error slot. A blocking publish gap renders through here too, so the
 * message position never moves between "invalid" and "blocks publish".
 */
export function ErrorMessage({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p
      id={id}
      className="mt-[5px] flex items-start gap-[5px] font-sans text-[11.5px] leading-[1.45] text-danger"
    >
      <span aria-hidden="true">{'⚠'}</span>
      <span>{children}</span>
    </p>
  );
}

/** The pending marker's note. Grey, and never shaped like an error. */
export function GapNote({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p
      id={id}
      className="mt-[5px] font-sans text-[11.5px] leading-[1.45] text-ink3"
    >
      {children}
    </p>
  );
}

export type PillTone = 'ok' | 'warn' | 'danger' | 'neutral' | 'accent';

const PILL_TONE: Record<PillTone, string> = {
  ok: 'bg-ok-soft text-ok border-ok',
  warn: 'bg-warn-soft text-warn border-warn',
  danger: 'bg-danger-soft text-danger border-danger',
  neutral: 'bg-tag-bg text-tag-ink border-line-strong',
  accent: 'bg-accent-soft text-accent border-accent-line',
};

export function Pill({
  tone = 'neutral',
  children,
}: {
  tone?: PillTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-full border px-[7px] py-[4px] font-mono text-[9.5px] font-semibold uppercase leading-none tracking-[0.06em] ${PILL_TONE[tone]}`}
    >
      {children}
    </span>
  );
}

export interface TagProps {
  readonly children: ReactNode;
  /** Absent makes the tag static — a rendered value rather than a control. */
  readonly onRemove?: (() => void) | undefined;
  readonly removeLabel?: string | undefined;
  readonly disabled?: boolean | undefined;
}

export function Tag({ children, onRemove, removeLabel, disabled }: TagProps) {
  return (
    <span className="inline-flex items-center gap-[6px] rounded-[4px] bg-tag-bg py-[4px] pl-[8px] pr-[4px] font-sans text-[11.5px] font-medium leading-none text-tag-ink">
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={removeLabel ?? 'Remove'}
          className={`${HIT_AREA} rounded-[4px] text-ink3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <span aria-hidden="true">&times;</span>
        </button>
      ) : null}
    </span>
  );
}

export type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  default: 'bg-surface border-line-strong text-ink hover:border-ink3',
  primary: 'bg-accent border-accent text-accent-ink',
  danger: 'bg-danger border-danger text-bg',
  ghost: 'bg-transparent border-transparent text-ink2',
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant | undefined;
  readonly sm?: boolean | undefined;
}

export function Button({
  variant = 'default',
  sm,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex cursor-pointer items-center gap-[6px] whitespace-nowrap rounded-field border font-sans font-medium leading-[1.2]',
        sm ? 'px-[8px] py-[4px] text-[11.5px]' : 'px-[11px] py-[6px] text-[12px]',
        BUTTON_VARIANT[variant],
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:border-line disabled:bg-surface2 disabled:text-ink3 disabled:hover:border-line',
        className ?? '',
      ].join(' ')}
      {...rest}
    />
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-card border border-line bg-surface ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

/** The mock's `.f2` and `.f3` — the only two grids a section editor uses. */
export function FieldGrid({
  cols,
  children,
}: {
  cols: 2 | 3;
  children: ReactNode;
}) {
  return (
    <div
      className={`grid gap-[14px] ${cols === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
    >
      {children}
    </div>
  );
}
