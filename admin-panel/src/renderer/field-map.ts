import type { FieldKind } from '../registry';

/*
 * The one place a field's data kind becomes a component.
 *
 * FieldKind is a *data* kind, not a widget name — the registry says what a
 * value is, and each consumer decides how to draw it. This table is admin's
 * half of that contract, and it is a table rather than a switch inside the
 * renderer so that adding a kind is an entry here and a failure to add one is
 * a type error rather than a blank space in a form.
 */

/** The M0 components a descriptor field can resolve to. */
export type ComponentName =
  | 'TextInput'
  | 'TextArea'
  | 'Select'
  | 'TagList'
  | 'Switch'
  | 'MediaPicker'
  | 'DateInput'
  | 'RichText'
  | 'Repeater'
  | 'EnumCards'
  | 'SlugField';

/**
 * Every kind the registry declares, mapped.
 *
 * `Record<FieldKind, …>` rather than a partial map on purpose: a kind added to
 * the registry fails to compile here until someone decides what draws it,
 * which is the only moment anyone will think about it.
 */
export const COMPONENT_FOR_KIND: Record<FieldKind, ComponentName> = {
  text: 'TextInput',
  /* Plain multi-line text. Rich text is a different kind, and the two are not
     interchangeable: FR-SEC-PROJ-12 sanitises one and escapes the other. */
  longtext: 'TextArea',
  url: 'TextInput',
  email: 'TextInput',
  date: 'DateInput',
  number: 'TextInput',
  boolean: 'Switch',
  image: 'MediaPicker',
  tags: 'TagList',
  /* An ordered list of free text — the accomplishment list of FR-SEC-EXP-1.
     A repeater of one text field rather than a tag list, because order is
     meaningful and the entries are sentences. */
  list: 'Repeater',
  /*
   * A closed set renders as a Select, not as EnumCards.
   *
   * EnumCards exists for a choice where each option needs a sentence — the
   * preset picker of FR-AUTH-5 — and the descriptor has no way to say that a
   * given enum is that kind of choice. Until it does, the default is the
   * compact control, and the preset screen (not built in this milestone)
   * reaches for EnumCards directly rather than through a descriptor.
   */
  enum: 'Select',
  multiselect: 'TagList',
  link: 'TextInput',
};

/** The HTML input type for the kinds that render as a TextInput. */
export const INPUT_TYPE_FOR_KIND: Partial<
  Record<FieldKind, 'text' | 'email' | 'url'>
> = {
  email: 'email',
  url: 'url',
  link: 'url',
};

/**
 * The precision every `date` field renders at.
 *
 * A constant and not a function of the kind, because the registry declares one
 * `date` kind and no precision to vary on. Month is what FR-SEC-EXP-1 and
 * FR-SEC-EDU-1 need; FR-SEC-SPK-1 and FR-SEC-BLOG-1 want a full date and the
 * descriptor has no way to say so. Listed in the report as a registry gap.
 */
export const DATE_PRECISION: 'month' | 'day' = 'month';
