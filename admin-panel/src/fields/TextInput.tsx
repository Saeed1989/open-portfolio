import { FieldShell, type FieldBaseProps } from './FieldShell';

export interface TextInputProps extends FieldBaseProps {
  readonly value: string;
  readonly onChange?: ((value: string) => void) | undefined;
  readonly placeholder?: string | undefined;
  readonly type?: 'text' | 'email' | 'url' | undefined;
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  ...base
}: TextInputProps) {
  return (
    <FieldShell {...base}>
      {(control) => (
        <input
          id={control.id}
          type={type}
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
