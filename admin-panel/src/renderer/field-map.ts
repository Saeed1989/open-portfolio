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
     interchangeable: one is sanitised and the other escaped. */
  longtext: 'TextArea',
  url: 'TextInput',
  email: 'TextInput',
  date: 'DateInput',
  number: 'TextInput',
  boolean: 'Switch',
  image: 'MediaPicker',
  tags: 'TagList',
  /* An ordered list of free text, such as an accomplishment list.
     A repeater of one text field rather than a tag list, because order is
     meaningful and the entries are sentences. */
  list: 'Repeater',
  /*
   * A closed set renders as a Select, not as EnumCards. EnumCards is for a
   * choice where each option needs a sentence, and the descriptor has no way
   * to say that an enum is that kind of choice.
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
 * The precision every `date` field renders at. A constant, because the
 * registry declares one `date` kind and no precision; some fields want a
 * full date and the descriptor cannot say so.
 */
export const DATE_PRECISION: 'month' | 'day' = 'month';
