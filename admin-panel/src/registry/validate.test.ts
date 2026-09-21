import { describe, expect, test } from 'vitest';
import {
  isRequiredNow,
  readFieldValue,
  readiness,
  validateForPublish,
  type CollectionSectionDescriptor,
  type FieldDescriptor,
  type SingleSectionDescriptor,
} from './index';

/*
 * D4's validator, over descriptors it has never seen.
 *
 * Every descriptor below is invented for the test. That is the point: if any
 * of these needed a change inside the validator, the validator would not be
 * generic and FR-REG-3 would not hold.
 */

const conditional = {
  type: 'invented',
  label: 'Invented',
  description: 'Not a real section type.',
  priority: 'must',
  businessRef: '—',
  cardinality: 'single',
  fields: [
    { key: 'always', label: 'Always', kind: 'text', required: true },
    { key: 'trigger', label: 'Trigger', kind: 'enum', options: ['a', 'b'] },
    {
      key: 'followsPresence',
      label: 'Follows presence',
      kind: 'text',
      requiredWhen: { field: 'trigger', present: true },
    },
    {
      key: 'followsValue',
      label: 'Follows value',
      kind: 'text',
      requiredWhen: { field: 'trigger', oneOf: ['b'] },
    },
    { key: 'never', label: 'Never', kind: 'text' },
  ],
  emptyCondition: () => false,
} satisfies SingleSectionDescriptor;

describe('conditional required', () => {
  test('a requiredWhen field is not required while its trigger is empty', () => {
    const errors = validateForPublish(conditional, { always: 'x' });
    expect(errors).toEqual([]);
  });

  test('present: true fires once the trigger holds any value', () => {
    const errors = validateForPublish(conditional, {
      always: 'x',
      trigger: 'a',
    });
    expect(errors.map((error) => error.path)).toEqual(['followsPresence']);
  });

  test('oneOf fires only for the listed values', () => {
    const onA = validateForPublish(conditional, { always: 'x', trigger: 'a' });
    expect(onA.map((error) => error.path)).not.toContain('followsValue');

    const onB = validateForPublish(conditional, { always: 'x', trigger: 'b' });
    expect(onB.map((error) => error.path)).toContain('followsValue');
  });

  test('the message says why, not just what', () => {
    const [error] = validateForPublish(conditional, {
      always: 'x',
      trigger: 'a',
    });
    expect(error?.message).toContain('because');
    expect(error?.code).toBe('required');
  });

  test('unconditional required is unaffected by siblings', () => {
    const errors = validateForPublish(conditional, {});
    expect(errors.map((error) => error.path)).toContain('always');
  });

  test('every failure is collected, never only the first (FR-PUB-6)', () => {
    const errors = validateForPublish(conditional, { trigger: 'b' });
    expect(errors.map((error) => error.path).sort()).toEqual([
      'always',
      'followsPresence',
      'followsValue',
    ]);
  });
});

/* Declared standalone so the tests can reference the field itself without
   indexing into `fields`, which `noUncheckedIndexedAccess` widens to
   `FieldDescriptor | undefined`. */
const hideableLink = {
  key: 'link',
  label: 'Link',
  kind: 'link',
  required: true,
  hideable: true,
} satisfies FieldDescriptor;

const hideable = {
  type: 'invented-hideable',
  label: 'Hideable',
  description: '',
  priority: 'must',
  businessRef: '—',
  cardinality: 'single',
  fields: [hideableLink],
  emptyCondition: () => false,
} satisfies SingleSectionDescriptor;

describe('hideable fields', () => {
  test('the value is read from inside the { value, visible } wrapper', () => {
    expect(
      readFieldValue(hideableLink, { link: { value: 'a.dev', visible: true } }),
    ).toBe('a.dev');
  });

  test('a visible hideable field is still required', () => {
    const errors = validateForPublish(hideable, {
      link: { value: '', visible: true },
    });
    expect(errors.map((error) => error.path)).toEqual(['link']);
  });

  test('a hidden field is not required — it will not be rendered', () => {
    const errors = validateForPublish(hideable, {
      link: { value: '', visible: false },
    });
    expect(errors).toEqual([]);
  });

  test('hiding retains the value rather than clearing it', () => {
    /* The reducer half of this lives in SectionForm; here we assert the
       contract the validator relies on: a hidden field with a value still
       reads that value back. */
    const hidden = { link: { value: 'kept.dev', visible: false } };
    expect(readFieldValue(hideableLink, hidden)).toBe('kept.dev');
    expect(isRequiredNow(hideableLink, hidden)).toBe(false);
  });
});

const collection = {
  type: 'invented-collection',
  label: 'Collection',
  description: '',
  priority: 'should',
  businessRef: '—',
  cardinality: 'collection',
  min: 2,
  max: 3,
  itemNoun: 'entry',
  itemLabel: '{name}',
  itemFields: [
    { key: 'name', label: 'Name', kind: 'text', required: true },
    { key: 'note', label: 'Note', kind: 'text' },
  ],
  emptyCondition: () => false,
} satisfies CollectionSectionDescriptor;

describe('collections', () => {
  test('min is reported on the collection, addressed to items', () => {
    const errors = validateForPublish(collection, { items: [{ name: 'a' }] });
    const min = errors.find((error) => error.code === 'min_items');
    expect(min?.path).toBe('items');
    expect(min?.message).toContain('at least 2');
  });

  test('item failures are addressed by index', () => {
    const errors = validateForPublish(collection, {
      items: [{ name: 'a' }, { note: 'no name here' }],
    });
    expect(errors.map((error) => error.path)).toContain('items[1].name');
  });

  test('exceeding max is reported, since Add should have prevented it', () => {
    const errors = validateForPublish(collection, {
      items: [{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }],
    });
    expect(errors.some((error) => error.code === 'max_items')).toBe(true);
  });

  test('a complete collection produces nothing', () => {
    expect(
      validateForPublish(collection, {
        items: [{ name: 'a' }, { name: 'b' }],
      }),
    ).toEqual([]);
  });
});

describe('readiness', () => {
  test('counts every drawn field, not only the required ones', () => {
    /* The mock's hero rail reads "7 of 8" against eight fields of which two
       are required — filled-ness and blocking-ness are different questions. */
    const content = { always: 'x', trigger: 'a' };
    const errors = validateForPublish(conditional, content);
    const stats = readiness(conditional, content, errors);
    expect(stats.total).toBe(5);
    expect(stats.filled).toBe(2);
    expect(stats.blocking).toBe(errors.length);
  });
});
