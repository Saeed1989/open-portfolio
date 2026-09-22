import { describe, expect, test } from 'vitest';
import type { FieldKind } from '../registry';
import {
  COMPONENT_FOR_KIND,
  INPUT_TYPE_FOR_KIND,
  type ComponentName,
} from './field-map';

/*
 * The table is the whole of "no other place decides which component a field
 * gets", so it is worth asserting that it stays total and stays a table.
 */

const ALL_KINDS: readonly FieldKind[] = [
  'text',
  'longtext',
  'url',
  'email',
  'date',
  'number',
  'boolean',
  'image',
  'tags',
  'list',
  'enum',
  'multiselect',
  'link',
];

describe('kind to component', () => {
  test('every declared kind resolves to a component', () => {
    for (const kind of ALL_KINDS) {
      expect(COMPONENT_FOR_KIND[kind], `${kind} has no component`).toBeDefined();
    }
  });

  test('the table covers exactly the declared kinds, and no more', () => {
    expect(Object.keys(COMPONENT_FOR_KIND).sort()).toEqual(
      [...ALL_KINDS].sort(),
    );
  });

  test('each kind maps to one of the M0 components', () => {
    const known: readonly ComponentName[] = [
      'TextInput',
      'TextArea',
      'Select',
      'TagList',
      'Switch',
      'MediaPicker',
      'DateInput',
      'RichText',
      'Repeater',
      'EnumCards',
      'SlugField',
    ];
    for (const kind of ALL_KINDS) {
      expect(known).toContain(COMPONENT_FOR_KIND[kind]);
    }
  });

  test('the kinds that are addresses carry the matching input type', () => {
    expect(INPUT_TYPE_FOR_KIND.email).toBe('email');
    expect(INPUT_TYPE_FOR_KIND.url).toBe('url');
    expect(INPUT_TYPE_FOR_KIND.link).toBe('url');
    /* Plain text must not claim a type it is not. */
    expect(INPUT_TYPE_FOR_KIND.text).toBeUndefined();
  });
});
