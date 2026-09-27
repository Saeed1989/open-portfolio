import { FieldShell, type FieldBaseProps } from './FieldShell';

export interface TextAreaProps extends FieldBaseProps {
  readonly value: string;
  readonly onChange?: ((value: string) => void) | undefined;
  readonly placeholder?: string | undefined;
  readonly rows?: number | undefined;
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  ...base
}: TextAreaProps) {
  return (
    <FieldShell {...base} controlExtra="min-h-[58px] resize-y">
      {(control) => (
        <textarea
          id={control.id}
          rows={rows}
          className={control.className}
          value={value}
          placeholder={placeholder}
          disabled={control.disabled}
          aria-invalid={control.invalid || undefined}
          aria-describedby={control.describedBy}
          onChange={(event) => onChange?.(event.target.value)}
        />
      )}
    </FieldShell>
  );
}
