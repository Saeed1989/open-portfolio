import { describe, expect, test } from 'vitest';
import type { ValidationError } from '../registry';
import { buildGapMap } from './gaps';

/*
 * The join between the validator's paths and the form's field ids.
 *
 * If these two ever disagree about how a path is spelled, gaps silently stop
 * appearing — the map returns nothing and every field looks fine. That failure
 * is invisible in the UI, which is why it is asserted here.
 */

const errors: readonly ValidationError[] = [
  { path: 'name', code: 'required', message: 'Name is required to publish.' },
  {
    path: 'ctaTarget',
    code: 'required',
    message: 'CTA target is required to publish, because another field is set.',
  },
  {
    path: 'items[2].company',
    code: 'required',
    message: 'Company is required to publish.',
  },
];

describe('gap mapping', () => {
  test('a path with an error carries its message', () => {
    const map = buildGapMap(errors, false);
    expect(map.at('name').note).toBe('Name is required to publish.');
  });

  test('a path without one carries nothing', () => {
    const map = buildGapMap(errors, false);
    expect(map.at('tagline')).toEqual({ gap: 'none', note: undefined });
  });

  test('collection paths are addressed by index', () => {
    const map = buildGapMap(errors, false);
    expect(map.at('items[2].company').gap).toBe('pending');
    /* A different row of the same field is a different path. */
    expect(map.at('items[0].company').gap).toBe('none');
  });

  test('before a publish attempt, every gap is pending', () => {
    const map = buildGapMap(errors, false);
    for (const error of errors) {
      expect(map.at(error.path).gap).toBe('pending');
    }
  });

  test('after a publish attempt, the same gaps are blocking', () => {
    const map = buildGapMap(errors, true);
    for (const error of errors) {
      expect(map.at(error.path).gap).toBe('blocking');
    }
  });

  test('the flag changes nothing but the colour', () => {
    const pending = buildGapMap(errors, false);
    const blocking = buildGapMap(errors, true);
    for (const error of errors) {
      expect(pending.at(error.path).note).toBe(blocking.at(error.path).note);
    }
    expect(pending.blocking).toBe(blocking.blocking);
  });

  test('two failures on one path show the first and count both', () => {
    const doubled: ValidationError[] = [
      { path: 'name', code: 'required', message: 'first' },
      { path: 'name', code: 'too_short', message: 'second' },
    ];
    const map = buildGapMap(doubled, false);
    expect(map.at('name').note).toBe('first');
    expect(map.blocking).toBe(2);
  });

  test('no errors means no gaps anywhere', () => {
    const map = buildGapMap([], true);
    expect(map.at('anything').gap).toBe('none');
    expect(map.blocking).toBe(0);
  });
});
