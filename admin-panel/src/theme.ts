/*
 * Dark mode on <html>, by class. Light / dark / system is an explicit choice,
 * so `system` is resolved here rather than left to a media query the tenant
 * cannot override. This is the admin panel's own chrome, not the tenant's
 * published theme.
 */
export type ThemeMode = 'light' | 'dark' | 'system';

const KEY = 'openfolio.theme';

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.classList.toggle(
    'dark',
    resolveTheme(mode) === 'dark',
  );
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* Storage disabled: the class is applied, the choice is not remembered. */
  }
}

export function storedTheme(): ThemeMode {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' || value === 'system'
      ? value
      : 'system';
  } catch {
    return 'system';
  }
}
