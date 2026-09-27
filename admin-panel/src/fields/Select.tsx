import { FieldShell, type FieldBaseProps } from './FieldShell';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export interface SelectProps extends FieldBaseProps {
  readonly value: string;
  readonly options: readonly SelectOption[];
  readonly onChange?: ((value: string) => void) | undefined;
  /** Rendered as a disabled first option, so empty reads as placeholder. */
  readonly placeholder?: string | undefined;
}

export function Select({
  value,
  options,
  onChange,
  placeholder,
  ...base
}: SelectProps) {
  return (
    <FieldShell {...base}>
      {(control) => (
        <select
          id={control.id}
          /* An empty select shows the placeholder option, which the browser
             renders in the control's own colour — so the placeholder state is
             carried by the text colour here rather than ::placeholder. */
          className={`${control.className} ${value === '' ? 'text-ink3' : ''}`}
          value={value}
          disabled={control.disabled}
          aria-invalid={control.invalid || undefined}
          aria-describedby={control.describedBy}
          onChange={(event) => onChange?.(event.target.value)}
        >
          {placeholder !== undefined ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}
