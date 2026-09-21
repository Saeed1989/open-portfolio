import type { ReactNode } from 'react';
import { DateInput } from '../fields/DateInput';
import { EnumCards } from '../fields/EnumCards';
import { MediaPicker } from '../fields/MediaPicker';
import { Repeater } from '../fields/Repeater';
import { RichText } from '../fields/RichText';
import { Select } from '../fields/Select';
import { SlugField } from '../fields/SlugField';
import { Switch } from '../fields/Switch';
import { TagList } from '../fields/TagList';
import { TextArea } from '../fields/TextArea';
import { TextInput } from '../fields/TextInput';
import type { Gap } from '../ui/field-chrome';

/*
 * The eleven components and the seven states, as data.
 *
 * Separated from the component that draws them so that the a11y suite can
 * import the list without importing a React component, and so that the
 * matrix file exports only components.
 *
 * Nothing here is section-specific. The sample values are generic on purpose —
 * a component named or shaped for a section type would be the thing M0 exists
 * to prevent.
 */

export type CellKind =
  | 'default'
  | 'focus'
  | 'error'
  | 'disabled'
  | 'placeholder'
  | 'pending'
  | 'blocking';

export const CELLS: ReadonlyArray<{ kind: CellKind; label: string }> = [
  { kind: 'default', label: 'default' },
  { kind: 'focus', label: 'focus' },
  { kind: 'error', label: 'error' },
  { kind: 'disabled', label: 'disabled' },
  { kind: 'placeholder', label: 'placeholder' },
  { kind: 'pending', label: "gap 'pending'" },
  { kind: 'blocking', label: "gap 'blocking'" },
];

const ERROR_MESSAGE = 'Enter between 1 and 80 characters.';
const PENDING_NOTE = 'Required to publish. Not blocking this save.';
const BLOCKING_NOTE = 'Required to publish.';

interface Chrome {
  readonly error?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly gap?: Gap | undefined;
  readonly gapNote?: string | undefined;
  readonly demoFocus?: boolean | undefined;
}

/** The chrome props for a cell. The one place the seven states are defined. */
function chrome(kind: CellKind): Chrome {
  switch (kind) {
    case 'focus':
      return { demoFocus: true };
    case 'error':
      return { error: ERROR_MESSAGE };
    case 'disabled':
      return { disabled: true };
    case 'pending':
      return { gap: 'pending', gapNote: PENDING_NOTE };
    case 'blocking':
      return { gap: 'blocking', gapNote: BLOCKING_NOTE };
    case 'default':
    case 'placeholder':
      return {};
  }
}

/** Placeholder is the only state that changes the value rather than the chrome. */
const isEmpty = (kind: CellKind) => kind === 'placeholder';

export interface ComponentSpec {
  readonly name: string;
  readonly note: string;
  readonly render: (id: string, kind: CellKind) => ReactNode;
}

const REPEATER_ITEMS = [
  { id: 'a', text: 'Cut median reconciliation time from 40 minutes to 90 seconds' },
  { id: 'b', text: 'Removed the nightly batch entirely' },
];

/*
 * A blank SVG of the right aspect ratio, carrying no colour of its own — the
 * picker's own `bg-surface2` shows through it. A placeholder with a baked-in
 * fill would be the one literal colour outside the token file.
 */
const ASSET = {
  id: 'asset-1',
  url:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="172" height="108"/>',
    ),
  fileName: 'dashboard.png',
  width: 1280,
  height: 800,
  altText: 'Reconciliation dashboard showing matched and unmatched ledgers',
};

export const SPECS: readonly ComponentSpec[] = [
  {
    name: 'TextInput',
    note: 'One line of plain text.',
    render: (id, kind) => (
      <TextInput
        id={id}
        label="Professional title"
        required
        value={isEmpty(kind) ? '' : 'Staff Backend Engineer'}
        placeholder="Staff Backend Engineer"
        hint="Shown under your name."
        {...chrome(kind)}
      />
    ),
  },
  {
    name: 'TextArea',
    note: 'Multiple lines of plain text.',
    render: (id, kind) => (
      <TextArea
        id={id}
        label="Tagline"
        value={
          isEmpty(kind)
            ? ''
            : 'I build payment systems that reconcile themselves.'
        }
        placeholder="One or two lines"
        hint="Two to three sentences reads best."
        {...chrome(kind)}
      />
    ),
  },
  {
    name: 'Select',
    note: 'One value from a closed list.',
    render: (id, kind) => (
      <Select
        id={id}
        label="Call to action"
        required
        value={isEmpty(kind) ? '' : 'resume'}
        placeholder="Choose a type"
        options={[
          { value: 'resume', label: 'Résumé download' },
          { value: 'schedule', label: 'Scheduling link' },
          { value: 'url', label: 'External URL' },
        ]}
        {...chrome(kind)}
      />
    ),
  },
  {
    name: 'TagList',
    note: 'Chips, removable, with a suggestion source passed in.',
    render: (id, kind) => (
      <TagList
        id={id}
        label="Tech stack"
        required
        value={isEmpty(kind) ? [] : ['TypeScript', 'PostgreSQL', 'Kafka']}
        placeholder="Type and press Enter"
        suggestions={['Redis', 'Terraform']}
        {...chrome(kind)}
      />
    ),
  },
  {
    name: 'Switch',
    note: 'A state applied immediately, not on submit.',
    render: (id, kind) => (
      <Switch
        id={id}
        label="Show this section"
        checked={!isEmpty(kind)}
        hint="A section that is on but empty is left out of the page entirely."
        {...chrome(kind)}
      />
    ),
  },
  {
    name: 'MediaPicker',
    note: 'An asset card and its alt text, as one field.',
    render: (id, kind) => (
      <MediaPicker
        id={id}
        label="Screenshot"
        required
        value={isEmpty(kind) ? null : ASSET}
        {...(kind === 'error' ? { altError: 'Alt text is required.' } : {})}
        {...chrome(kind)}
      />
    ),
  },
  {
    name: 'DateInput',
    note: 'Month precision and full-date precision, declared by the caller.',
    render: (id, kind) => (
      <>
        <DateInput
          id={id}
          label="Graduated"
          precision="month"
          value={isEmpty(kind) ? '' : '2019-06'}
          {...chrome(kind)}
        />
        <div className="mt-[12px]">
          <DateInput
            id={`${id}-day`}
            label="Talk date"
            precision="day"
            value={isEmpty(kind) ? '' : '2026-04-17'}
            {...chrome(kind)}
          />
        </div>
      </>
    ),
  },
  {
    name: 'RichText',
    note: 'Six controls: bold, italic, underline, bulleted, numbered, clear.',
    render: (id, kind) => (
      <RichText
        id={id}
        label="My role (full)"
        required
        value={
          isEmpty(kind)
            ? ''
            : '<p>I owned the <strong>settlement path</strong> end to end.</p>'
        }
        placeholder="First person. Name the components you owned."
        {...(kind === 'default' ? { demoActive: 'bold' as const } : {})}
        {...chrome(kind)}
      />
    ),
  },
  {
    name: 'Repeater',
    note: 'Ordered. Drag handle, arrow keys, add, remove.',
    render: (id, kind) => (
      <Repeater
        id={id}
        label="Accomplishments"
        items={isEmpty(kind) ? [] : REPEATER_ITEMS}
        itemKey={(item) => item.id}
        itemLabel={(item) => item.text}
        addLabel="accomplishment"
        emptyNote="Nothing here yet."
        renderItem={(item) => (
          <span className="font-sans text-[12px] leading-[1.5] text-ink">
            {item.text}
          </span>
        )}
        {...(kind === 'default'
          ? { addDisabledReason: undefined }
          : kind === 'placeholder'
            ? { addDisabledReason: undefined }
            : {})}
        {...chrome(kind)}
      />
    ),
  },
  {
    name: 'EnumCards',
    note: 'One value from a set where each needs a sentence.',
    render: (id, kind) => (
      <EnumCards
        id={id}
        label="Preset"
        required
        columns={2}
        value={isEmpty(kind) ? '' : 'software-engineer'}
        options={[
          {
            value: 'software-engineer',
            label: 'Software engineer',
            description: 'A starting set of sections and labels.',
          },
          {
            value: 'designer',
            label: 'Designer',
            unavailableNote: 'Coming soon',
          },
        ]}
        {...chrome(kind)}
      />
    ),
  },
  {
    name: 'SlugField',
    note: 'Input and the fixed suffix, drawn as one control.',
    render: (id, kind) => (
      <SlugField
        id={id}
        label="Your address"
        required
        value={isEmpty(kind) ? '' : 'dvillalobos'}
        placeholder="yourname"
        hint="Lowercase letters, numbers and hyphens."
        {...chrome(kind)}
      />
    ),
  },
];

