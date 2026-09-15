import { useId } from 'react';
import { Icon } from './Icon';
import { Input, type InputSize, type InputTone } from './Input';

/**
 * `taken` and `reserved` are built but not reachable from this app until
 * §10.3 Q4 is resolved; this component calls nothing.
 */
export type SlugState = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'reserved';

const tones: Record<SlugState, InputTone> = {
  idle: 'default',
  invalid: 'danger',
  checking: 'accent',
  available: 'success',
  taken: 'danger',
  reserved: 'danger',
};

const messageTones: Record<SlugState, string> = {
  idle: 'text-text-subtle',
  invalid: 'text-danger',
  checking: 'text-text-muted',
  available: 'text-success',
  taken: 'text-danger',
  reserved: 'text-danger',
};

interface SlugInputProps {
  /** Accessible name; visually hidden. */
  label: string;
  /** Fixed domain suffix, e.g. ".openfolio.com". */
  suffix: string;
  value: string;
  onChange: (value: string) => void;
  state: SlugState;
  message: string;
  placeholder?: string;
  maxLength?: number;
  name?: string;
  size?: InputSize;
  /** Layout classes only. */
  className?: string;
}

export function SlugInput({
  label,
  suffix,
  value,
  onChange,
  state,
  message,
  placeholder,
  maxLength,
  name,
  size = 'lg',
  className,
}: SlugInputProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const invalid = state === 'invalid' || state === 'taken' || state === 'reserved';

  let trailing;
  if (state === 'checking') trailing = <Icon name="spinner" />;
  if (state === 'available') trailing = <Icon name="check" className="text-success" />;

  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        size={size}
        tone={tones[state]}
        mono
        suffix={suffix}
        trailing={trailing}
        aria-invalid={invalid}
        aria-describedby={messageId}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
      />
      <p
        id={messageId}
        aria-live="polite"
        className={['mt-2 min-h-5 font-mono text-caption', messageTones[state]].join(' ')}
      >
        {message}
      </p>
    </div>
  );
}
