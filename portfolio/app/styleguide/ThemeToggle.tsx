'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';

type Theme = 'light' | 'dark';

/**
 * Flips the theme by rewriting `data-theme` on <html> — nothing else.
 *
 * That is the whole point of the token layer: every colour in the app resolves
 * through a CSS custom property at paint time, so one attribute change
 * re-themes the page with no re-render, no rebuild and no stylesheet swap. If
 * anything had been compiled to a literal, it would visibly fail to follow.
 *
 * This is the only client component in the app.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <Button
      variant="secondary"
      size="sm"
      aria-pressed={theme === 'dark'}
      onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
    >
      Page theme: {theme}
    </Button>
  );
}
