import type { Metadata } from 'next';
import { Heading, Text } from '@/components/ui';
import { Gallery } from './Gallery';
import { ThemeToggle } from './ThemeToggle';

/**
 * Development aid. Renders every primitive in every variant, in both themes at
 * once — the two panels below set `data-theme` on a wrapper rather than on
 * <html>, which works because the token blocks in globals.css are element
 * selectors, not media queries.
 *
 * Kept out of the sitemap (app/sitemap.ts), disallowed in robots.txt
 * (app/robots.ts), and marked noindex here so all three agree.
 */
export const metadata: Metadata = {
  title: 'Styleguide',
  robots: { index: false, follow: false },
};

function Panel({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <div
      data-theme={theme}
      className="min-w-0 flex-1 bg-bg text-text px-gutter py-section-y"
    >
      <div className="mb-32 flex flex-col gap-8">
        <Text variant="mono" tone="muted">
          data-theme=&quot;{theme}&quot;
        </Text>
        <Heading level={2} visual="subheading">
          {theme === 'light' ? 'Light' : 'Dark'}
        </Heading>
      </div>
      <Gallery />
    </div>
  );
}

export default function StyleguidePage() {
  return (
    <main className="min-h-full bg-bg text-text">
      <header className="mx-auto flex w-full max-w-content flex-wrap items-baseline justify-between gap-x-24 gap-y-12 px-gutter py-32">
        <div className="flex flex-col gap-8 min-w-0">
          <Heading level={1} visual="heading">
            Styleguide
          </Heading>
          <Text variant="caption" tone="muted" balance>
            Every primitive in every variant. Both panels below are rendered
            once each, in a light and a dark scope; the button re-themes the
            whole document at runtime by rewriting one attribute.
          </Text>
        </div>
        <ThemeToggle />
      </header>

      <div className="flex flex-col border-t border-border lg:flex-row">
        <Panel theme="light" />
        <div className="border-t border-border lg:border-l lg:border-t-0" />
        <Panel theme="dark" />
      </div>
    </main>
  );
}
