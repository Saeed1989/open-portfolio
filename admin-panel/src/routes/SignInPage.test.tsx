import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { SignInPage } from './SignInPage';

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <SignInPage />
    </MemoryRouter>,
  );
  return screen.getByRole('link', { name: 'Sign in with Google' });
}

test('the link is a plain navigation to the start endpoint', () => {
  expect(renderAt('/sign-in').getAttribute('href')).toBe(
    '/api/auth/google/start',
  );
  expect(screen.queryByRole('alert')).toBeNull();
});

test('a returnTo in the query is not passed on (open question 28)', () => {
  expect(
    renderAt('/sign-in?returnTo=%2Fsections%2Fprojects').getAttribute('href'),
  ).toBe('/api/auth/google/start');
});

test('account_suspended renders the suspended state', () => {
  renderAt('/sign-in?error=account_suspended');
  expect(screen.getByRole('alert').textContent).toContain(
    'This account is suspended',
  );
});

test('an unknown code renders the auth_failed copy, never the value', () => {
  renderAt('/sign-in?error=%3Cb%3Epwned');
  const alert = screen.getByRole('alert').textContent;
  expect(alert).toContain('Could not complete sign-in');
  expect(document.body.textContent).not.toContain('pwned');
});
