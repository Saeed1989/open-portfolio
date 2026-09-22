import { act, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { expect, test } from 'vitest';
import { CELLS, SPECS } from './field-specs';
import { DevFields } from './DevFields';

/*
 * The accessibility rules of item 3, checked rather than asserted in a comment.
 *
 * axe runs here in jsdom, which has no layout engine — so `color-contrast`
 * cannot be evaluated and is disabled rather than silently passing. The token
 * pairs are checked in a real browser instead. This suite covers every rule
 * that does not need pixels: label association, `aria-invalid`,
 * `aria-describedby` targets that exist, duplicate ids, heading order, roles
 * and accessible names.
 */

/** Renders and lets the one mount-time fetch settle, so no state update
 *  lands outside `act`. */
async function renderPage() {
  const view = render(<DevFields />);
  await act(async () => {
    await Promise.resolve();
  });
  return view;
}

test('/dev/fields has no axe violations', async () => {
  const { container } = await renderPage();

  const results = await axe.run(container, {
    resultTypes: ['violations'],
    rules: {
      /* Needs layout. Verified in a browser, not here. */
      'color-contrast': { enabled: false },
    },
  });

  const summary = results.violations.map(
    (violation) =>
      `${violation.id} (${String(violation.nodes.length)}): ${violation.help}`,
  );

  expect(summary).toEqual([]);
  /* axe walks every rendered node, and this page renders 11 components x 7
     states x 2 themes. In jsdom that lands a little either side of Vitest's
     5s default, so the budget is explicit rather than left to chance. */
}, 30_000);

test('every component renders in every state, in both themes', async () => {
  await renderPage();

  expect(SPECS).toHaveLength(11);
  expect(CELLS).toHaveLength(7);

  /* One heading per component per theme. */
  for (const spec of SPECS) {
    expect(
      screen.getAllByRole('heading', { name: spec.name, level: 3 }),
    ).toHaveLength(2);
  }

  /* One labelled cell per component per theme, for each of the seven states. */
  for (const cell of CELLS) {
    expect(screen.getAllByText(cell.label)).toHaveLength(SPECS.length * 2);
  }
});

test('an invalid field is marked invalid and points at its message', async () => {
  const { container } = await renderPage();

  const input = container.querySelector('#light-TextInput-error');
  expect(input).not.toBeNull();
  expect(input?.getAttribute('aria-invalid')).toBe('true');

  const describedBy = input?.getAttribute('aria-describedby') ?? '';
  expect(describedBy).toContain('light-TextInput-error-error');
  /* The hint is still referenced alongside the error, not replaced by it. */
  expect(describedBy).toContain('light-TextInput-error-hint');

  /* Every id it points at resolves. A dangling reference reads as nothing. */
  for (const id of describedBy.split(' ')) {
    expect(container.querySelector(`[id="${id}"]`)).not.toBeNull();
  }
});

test('a pending gap is not an error, and a blocking one is', async () => {
  const { container } = await renderPage();

  /* The publish-only marker must not claim the field is invalid — that is
     the whole point of the pending state existing. */
  const pending = container.querySelector('#light-TextInput-pending');
  expect(pending?.getAttribute('aria-invalid')).toBeNull();
  expect(
    pending?.getAttribute('aria-describedby'),
  ).toContain('light-TextInput-pending-gap');

  const blocking = container.querySelector('#light-TextInput-blocking');
  expect(blocking?.getAttribute('aria-invalid')).toBe('true');
  expect(
    blocking?.getAttribute('aria-describedby'),
  ).toContain('light-TextInput-blocking-error');
});

test('every field control is associated with a label', async () => {
  const { container } = await renderPage();

  const controls = container.querySelectorAll<HTMLElement>(
    'input, textarea, select, [role="textbox"], [role="switch"], [role="radiogroup"]',
  );
  expect(controls.length).toBeGreaterThan(0);

  for (const control of controls) {
    const id = control.getAttribute('id');
    const named =
      control.getAttribute('aria-label') !== null ||
      control.getAttribute('aria-labelledby') !== null ||
      (id !== null &&
        container.querySelector(`label[for="${id}"]`) !== null) ||
      control.closest('label') !== null;

    expect(named, `${control.tagName}#${id ?? '(no id)'} has no label`).toBe(
      true,
    );
  }
});
