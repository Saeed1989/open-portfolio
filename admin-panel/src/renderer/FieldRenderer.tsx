import { DateInput } from '../fields/DateInput';
import { MediaPicker, type MediaAsset } from '../fields/MediaPicker';
import { Repeater } from '../fields/Repeater';
import { Select } from '../fields/Select';
import { Switch } from '../fields/Switch';
import { TagList } from '../fields/TagList';
import { TextArea } from '../fields/TextArea';
import { TextInput } from '../fields/TextInput';
import {
  isFieldHidden,
  isRequiredNow,
  readFieldValue,
  type FieldDescriptor,
} from '../registry';
import type { Gap } from '../ui/field-chrome';
import { Switch as VisibilitySwitch } from '../fields/Switch';
import {
  COMPONENT_FOR_KIND,
  DATE_PRECISION,
  INPUT_TYPE_FOR_KIND,
} from './field-map';

/*
 * One descriptor field, drawn.
 *
 * Nothing here knows a section type. It reads the descriptor, asks
 * `COMPONENT_FOR_KIND` what draws this kind, and passes the same chrome props
 * every M0 component already accepts. A section type that needs a component
 * this file does not reach for is a registry problem, not a renderer one.
 */

export interface FieldRendererProps {
  readonly field: FieldDescriptor;
  /** The content object this field's key lives in — an item, in a collection. */
  readonly scope: unknown;
  /** Unique within the page; also the id the gap map is keyed by. */
  readonly id: string;
  readonly gap: Gap;
  readonly gapNote?: string | undefined;
  /** A save the server refused on content (D2's `refused`), not a publish gap. */
  readonly error?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly onChange: (key: string, value: unknown) => void;
  /** Only called for a `hideable` field. */
  readonly onVisibilityChange?: ((key: string, visible: boolean) => void) | undefined;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
}

function asStringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function asAsset(value: unknown): MediaAsset | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.url !== 'string') return null;
  return {
    id: typeof record.id === 'string' ? record.id : record.url,
    url: record.url,
    fileName: typeof record.fileName === 'string' ? record.fileName : 'image',
    width: typeof record.width === 'number' ? record.width : 0,
    height: typeof record.height === 'number' ? record.height : 0,
    altText: typeof record.altText === 'string' ? record.altText : '',
  };
}

export function FieldRenderer({
  field,
  scope,
  id,
  gap,
  gapNote,
  error,
  disabled,
  onChange,
  onVisibilityChange,
}: FieldRendererProps) {
  /* The package's `hidden` means admin asks for nothing — the value is
     recorded elsewhere. It is not a visibility toggle. */
  if (field.hidden === true) return null;

  const value = readFieldValue(field, scope);
  const required = isRequiredNow(field, scope);
  const hidden = isFieldHidden(field, scope);
  const component = COMPONENT_FOR_KIND[field.kind];

  /* A hidden hideable field keeps its value and stops being required, so it
     also stops showing a gap — the tenant is not being asked for it. */
  const effectiveGap: Gap = hidden ? 'none' : gap;

  const base = {
    id,
    label: field.label,
    required,
    hint: field.help,
    gap: effectiveGap,
    gapNote,
    error,
    disabled: disabled || hidden,
  };

  const control = (() => {
    switch (component) {
      case 'TextArea':
        return (
          <TextArea
            {...base}
            value={asString(value)}
            placeholder={field.placeholder}
            onChange={(next) => {
              onChange(field.key, next);
            }}
          />
        );

      case 'Select':
        return (
          <Select
            {...base}
            value={asString(value)}
            placeholder="Choose one"
            options={(field.options ?? []).map((option) => ({
              value: option,
              label: field.optionLabels?.[option] ?? option,
            }))}
            onChange={(next) => {
              onChange(field.key, next);
            }}
          />
        );

      case 'TagList':
        return (
          <TagList
            {...base}
            value={asStringArray(value)}
            placeholder="Type and press Enter"
            suggestions={field.options}
            onChange={(next) => {
              onChange(field.key, next);
            }}
          />
        );

      case 'Switch':
        return (
          <Switch
            {...base}
            checked={value === true}
            onChange={(next) => {
              onChange(field.key, next);
            }}
          />
        );

      case 'MediaPicker':
        return (
          <MediaPicker
            {...base}
            value={asAsset(value)}
            onRemove={() => {
              onChange(field.key, null);
            }}
          />
        );

      case 'DateInput':
        return (
          <DateInput
            {...base}
            precision={DATE_PRECISION}
            value={asString(value)}
            onChange={(next) => {
              onChange(field.key, next);
            }}
          />
        );

      case 'Repeater':
        return (
          <Repeater
            {...base}
            items={asStringArray(value)}
            itemKey={(_item, index) => `${id}-${String(index)}`}
            itemLabel={(item) => (item === '' ? 'Empty entry' : item)}
            addLabel={field.label.toLowerCase()}
            emptyNote="Nothing here yet."
            addDisabledReason={
              field.max !== undefined && asStringArray(value).length >= field.max
                ? `The maximum is ${String(field.max)}.`
                : undefined
            }
            onAdd={() => {
              onChange(field.key, [...asStringArray(value), '']);
            }}
            onChange={(next) => {
              onChange(field.key, next);
            }}
            renderItem={(item, index) => (
              <TextInput
                id={`${id}-item-${String(index)}`}
                label={`${field.label} ${String(index + 1)}`}
                value={item}
                onChange={(next) => {
                  const rows = [...asStringArray(value)];
                  rows[index] = next;
                  onChange(field.key, rows);
                }}
              />
            )}
          />
        );

      /* TextInput covers text, url, email, number and link — they differ by
         input type, not by control. */
      case 'TextInput':
      case 'EnumCards':
      case 'RichText':
      case 'SlugField':
      default:
        return (
          <TextInput
            {...base}
            type={INPUT_TYPE_FOR_KIND[field.kind] ?? 'text'}
            value={asString(value)}
            placeholder={field.placeholder}
            onChange={(next) => {
              onChange(field.key, next);
            }}
          />
        );
    }
  })();

  if (!field.hideable) return control;

  /*
   * FR-SEC-CON-2: the toggle sits beside the field, and hiding keeps the
   * value. The switch is a sibling control rather than something the field
   * components know about — none of the eleven has a notion of visibility,
   * and giving one would put a section's concern inside a generic component.
   */
  return (
    <div className="flex items-start gap-[14px]">
      <div className="min-w-0 flex-1">{control}</div>
      <div className="pt-[22px]">
        <VisibilitySwitch
          id={`${id}-visible`}
          label="Show on page"
          checked={!hidden}
          disabled={disabled}
          onChange={(next) => {
            onVisibilityChange?.(field.key, next);
          }}
        />
      </div>
    </div>
  );
}
