import { FieldShell, type FieldBaseProps } from './FieldShell';

/**
 * Input and the fixed `.openfolio.site` suffix, drawn as one control.
 *
 * The suffix is not editable and is not part of the value: a slug is the
 * subdomain label alone (§1.3), and FR-DAT-1 validates that label. Showing it
 * inside the control rather than beside it is what stops a tenant typing their
 * own domain into the box.
 */
export interface SlugFieldProps extends FieldBaseProps {
  readonly value: string;
  readonly onChange?: ((value: string) => void) | undefined;
  readonly placeholder?: string | undefined;
}

const SUFFIX = '.openfolio.site';

export function SlugField({
  value,
  onChange,
  placeholder,
  ...base
}: SlugFieldProps) {
  return (
    <FieldShell {...base} controlExtra="flex items-stretch p-0 overflow-hidden">
      {(control) => (
        <div className={control.className}>
          <input
            id={control.id}
            type="text"
            className="min-w-0 flex-1 bg-transparent px-[9px] py-[7px] font-mono text-[13px] leading-[1.35] text-ink outline-none placeholder:text-ink3 disabled:cursor-not-allowed"
            value={value}
            placeholder={placeholder}
            disabled={control.disabled}
            aria-invalid={control.invalid || undefined}
            aria-describedby={control.describedBy}
            onChange={(event) => onChange?.(event.target.value)}
          />
          {/* Not aria-hidden: the suffix is part of the address the tenant is
              choosing, so it is read after the value they typed. */}
          <span className="flex items-center whitespace-nowrap border-l border-line-strong bg-surface2 px-[10px] font-mono text-[13px] leading-[1.35] text-ink3">
            {SUFFIX}
          </span>
        </div>
      )}
    </FieldShell>
  );
}
