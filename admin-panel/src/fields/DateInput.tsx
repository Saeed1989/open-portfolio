import { FieldShell, type FieldBaseProps } from './FieldShell';

/**
 * A date at one of two precisions.
 *
 * The content model needs both and does not mix them: `graduationDate` and an
 * experience period are months (FR-SEC-EDU-1, FR-SEC-EXP-1), while a talk or a
 * blog post is a day (FR-SEC-SPK-1, FR-SEC-BLOG-1). Precision is the caller's
 * declaration, not something the tenant toggles, so a field cannot change what
 * it means between two drafts.
 *
 * The value is the stored string in either case — `YYYY-MM` or `YYYY-MM-DD` —
 * so the precision is legible in the data as well as in the control.
 */
export type DatePrecision = 'month' | 'day';

export interface DateInputProps extends FieldBaseProps {
  readonly value: string;
  readonly precision: DatePrecision;
  readonly onChange?: ((value: string) => void) | undefined;
}

export function DateInput({
  value,
  precision,
  onChange,
  ...base
}: DateInputProps) {
  return (
    <FieldShell {...base}>
      {(control) => (
        <input
          id={control.id}
          type={precision === 'month' ? 'month' : 'date'}
          className={control.className}
          value={value}
          disabled={control.disabled}
          aria-invalid={control.invalid || undefined}
          aria-describedby={control.describedBy}
          onChange={(event) => onChange?.(event.target.value)}
        />
      )}
    </FieldShell>
  );
}
