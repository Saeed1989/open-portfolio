import { describe, expect, it } from 'vitest';
import { isWellFormedSlug, normaliseSlug } from './slug';

/* The same cases api's e2e suite asserts, so the mirror cannot drift quietly. */
describe('slug format', () => {
  it('trims and lower-cases', () => {
    expect(normaliseSlug('  Eve-Dev ')).toBe('eve-dev');
  });

  it.each(['eve-dev', 'abc', 'a1b', 'a'.repeat(63)])('accepts %j', (slug) => {
    expect(isWellFormedSlug(slug)).toBe(true);
  });

  it.each(['', 'ab', '-x-', 'a--b', 'ünï', 'a_b', 'a.b', 'a'.repeat(64)])(
    'rejects %j',
    (slug) => {
      expect(isWellFormedSlug(normaliseSlug(slug))).toBe(false);
    },
  );
});
