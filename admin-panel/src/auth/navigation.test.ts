import { expect, test } from 'vitest';
import { safeReturnTo, signInUrl } from './navigation';

test.each([
  ['//evil.com', null],
  ['https://x', null],
  ['/\\evil', null],
  ['javascript:x', null],
  ['/dashboard?tab=1', '/dashboard?tab=1'],
  [null, null],
])('safeReturnTo(%j) is %j', (candidate, expected) => {
  expect(safeReturnTo(candidate)).toBe(expected);
});

test('the sign-in URL carries a safe returnTo, encoded', () => {
  expect(signInUrl('/dashboard?tab=1')).toBe(
    '/sign-in?returnTo=%2Fdashboard%3Ftab%3D1',
  );
});

test('the sign-in URL drops an unsafe returnTo', () => {
  expect(signInUrl('//evil.com')).toBe('/sign-in');
  expect(signInUrl()).toBe('/sign-in');
});
