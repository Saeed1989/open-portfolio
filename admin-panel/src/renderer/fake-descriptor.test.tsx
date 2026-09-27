import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  readiness,
  validateForPublish,
  type CollectionSectionDescriptor,
  type SingleSectionDescriptor,
} from '../registry';
import { buildGapMap } from './gaps';
import { itemLabelFor } from './item-label';
import { SectionForm } from './SectionForm';

/*
 * The FR-REG-3 proof.
 *
 * "Adding a new section type requires a registry entry plus one React
 * component in `portfolio`. It must not require changes to `admin`."
 *
 * The descriptors below are invented here, in the test file, and exist nowhere
 * else in the app. Nothing was added to the renderer, the validator, the map,
 * or the editor page to make them work. If any of these assertions needed a
 * change outside this file, admin would be failing FR-REG-3 and the registry
 * would not be doing the job it exists to do.
 */

const fakeSingle = {
  type: 'widget-audit',
  label: 'Widget audit',
  description: 'A section type that does not exist.',
  priority: 'should',
  businessRef: '—',
  cardinality: 'single',
  fields: [
    {
      key: 'auditor',
      label: 'Auditor',
      kind: 'text',
      required: true,
      help: 'Who signed it off.',
    },
    { key: 'summary', label: 'Summary', kind: 'longtext' },
    { key: 'auditedOn', label: 'Audited on', kind: 'date' },
    {
      key: 'severity',
      label: 'Severity',
      kind: 'enum',
      options: ['low', 'high'],
      optionLabels: { low: 'Low', high: 'High' },
    },
    { key: 'tags', label: 'Tags', kind: 'tags' },
    { key: 'passed', label: 'Passed', kind: 'boolean' },
    {
      key: 'evidence',
      label: 'Evidence URL',
      kind: 'url',
      requiredWhen: { field: 'severity', oneOf: ['high'] },
    },
    {
      key: 'contactLine',
      label: 'Contact line',
      kind: 'link',
      hideable: true,
    },
  ],
  emptyCondition: () => false,
} satisfies SingleSectionDescriptor;

const fakeCollection = {
  type: 'widget-batches',
  label: 'Widget batches',
  description: 'Also does not exist.',
  priority: 'could',
  businessRef: '—',
  cardinality: 'collection',
  min: 1,
  max: 2,
  itemNoun: 'batch',
  itemLabel: '{code} — {plant}',
  itemLabelFallback: 'New batch',
  itemFields: [
    { key: 'code', label: 'Code', kind: 'text', required: true },
    { key: 'plant', label: 'Plant', kind: 'text' },
  ],
  emptyCondition: () => false,
} satisfies CollectionSectionDescriptor;

const noGaps = buildGapMap([], false);
const noRefusals = new Map<string, string>();

describe('an invented single-cardinality section', () => {
  test('renders every declared field, in registry order', () => {
    render(
      <SectionForm
        descriptor={fakeSingle}
        content={{}}
        gaps={noGaps}
        refusedErrors={noRefusals}
        onChange={() => undefined}
      />,
    );

    for (const field of fakeSingle.fields) {
      expect(
        screen.getAllByText(field.label).length,
        `${field.label} did not render`,
      ).toBeGreaterThan(0);
    }
  });

  test('each kind reaches a control, not a blank space', () => {
    const { container } = render(
      <SectionForm
        descriptor={fakeSingle}
        content={{}}
        gaps={noGaps}
        refusedErrors={noRefusals}
        onChange={() => undefined}
      />,
    );

    expect(container.querySelector('#auditor')).not.toBeNull();
    expect(container.querySelector('#summary')?.tagName).toBe('TEXTAREA');
    expect(container.querySelector('#auditedOn')?.getAttribute('type')).toBe('month');
    expect(container.querySelector('#severity')?.tagName).toBe('SELECT');
    expect(container.querySelector('#passed')?.getAttribute('role')).toBe('switch');
    expect(container.querySelector('#evidence')?.getAttribute('type')).toBe('url');
  });

  test('a hideable field it has never seen gets a visibility switch', () => {
    const { container } = render(
      <SectionForm
        descriptor={fakeSingle}
        content={{}}
        gaps={noGaps}
        refusedErrors={noRefusals}
        onChange={() => undefined}
      />,
    );
    expect(container.querySelector('#contactLine-visible')).not.toBeNull();
    /* And a field that is not hideable does not get one. */
    expect(container.querySelector('#auditor-visible')).toBeNull();
  });

  test('validates with no code change', () => {
    const empty = validateForPublish(fakeSingle, {});
    expect(empty.map((error) => error.path)).toEqual(['auditor']);

    /* The conditional rule fires from the descriptor alone. */
    const high = validateForPublish(fakeSingle, {
      auditor: 'Someone',
      severity: 'high',
    });
    expect(high.map((error) => error.path)).toEqual(['evidence']);

    const low = validateForPublish(fakeSingle, {
      auditor: 'Someone',
      severity: 'low',
    });
    expect(low).toEqual([]);
  });

  test('its readiness counts come out of the same pass', () => {
    const content = { auditor: 'Someone', severity: 'high' };
    const errors = validateForPublish(fakeSingle, content);
    const stats = readiness(fakeSingle, content, errors);
    expect(stats.total).toBe(fakeSingle.fields.length);
    expect(stats.filled).toBe(2);
    expect(stats.blocking).toBe(1);
  });

  test('its gaps bind to its own field ids', () => {
    const errors = validateForPublish(fakeSingle, {});
    const gaps = buildGapMap(errors, false);
    const { container } = render(
      <SectionForm
        descriptor={fakeSingle}
        content={{}}
        gaps={gaps}
        refusedErrors={noRefusals}
        onChange={() => undefined}
      />,
    );
    /* pending, not blocking: no publish has been attempted. */
    expect(container.querySelector('#auditor')?.getAttribute('aria-invalid')).toBeNull();
    expect(
      container.querySelector('#auditor')?.getAttribute('aria-describedby'),
    ).toContain('auditor-gap');
  });
});

describe('an invented collection section', () => {
  test('renders its rows with the registry item label', () => {
    render(
      <SectionForm
        descriptor={fakeCollection}
        content={{ items: [{ code: 'B-1', plant: 'Leeds' }] }}
        gaps={noGaps}
        refusedErrors={noRefusals}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByText('B-1 — Leeds')).toBeDefined();
  });

  test('falls back rather than labelling a row with punctuation', () => {
    expect(itemLabelFor({}, '{code} — {plant}', 'New batch', 0)).toBe(
      'New batch 1',
    );
    expect(itemLabelFor({ code: 'B-2' }, '{code} — {plant}', 'New batch', 1)).toBe(
      'B-2 —',
    );
  });

  test('states its cap on the Add control and disables it at the max', () => {
    render(
      <SectionForm
        descriptor={fakeCollection}
        content={{ items: [{ code: 'a' }, { code: 'b' }] }}
        gaps={noGaps}
        refusedErrors={noRefusals}
        onChange={() => undefined}
      />,
    );
    const add = screen.getByRole('button', { name: '+ Add batch' });
    expect(add.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/maximum of 2/)).toBeDefined();
  });

  test('its min is reported on the collection, not on a field', () => {
    const errors = validateForPublish(fakeCollection, { items: [] });
    const gaps = buildGapMap(errors, false);
    expect(gaps.at('items').note).toContain('at least 1');

    render(
      <SectionForm
        descriptor={fakeCollection}
        content={{ items: [] }}
        gaps={gaps}
        refusedErrors={noRefusals}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByText(/at least 1 batch/)).toBeDefined();
  });

  test('item fields render in registry order for every row', () => {
    const { container } = render(
      <SectionForm
        descriptor={fakeCollection}
        content={{ items: [{ code: 'B-1' }] }}
        gaps={noGaps}
        refusedErrors={noRefusals}
        onChange={() => undefined}
      />,
    );
    /* An attribute selector, not `#id`: a collection path contains a dot, and
       `#items[0].code` parses as an id plus a class. The id itself is valid
       HTML and resolves through getElementById and aria-describedby. */
    expect(container.querySelector('[id="items[0].code"]')).not.toBeNull();
    expect(container.querySelector('[id="items[0].plant"]')).not.toBeNull();
  });
});
