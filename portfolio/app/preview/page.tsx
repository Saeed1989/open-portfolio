import type { Metadata } from 'next';
import { Link, PageSection, Stack, Text } from '@/components/ui';
import { SectionRenderer } from '@/components/sections/SectionRenderer';
import {
  droppedSections,
  fixtureSections,
  heroOnlySections,
} from './fixtures';

/**
 * Development aid. Renders SectionRenderer against a fixture portfolio so the
 * output can be held against design/portfolio.html.
 *
 * `?view=hero` is the FR-CFG-2 check: one hero, plus a disabled section, an
 * enabled-but-empty section, and a section whose every item is empty. If the
 * rule holds, the page ends after the hero — no heading, no rule, no gap.
 *
 * Kept out of the crawlable surface the same way /styleguide is.
 */
export const metadata: Metadata = {
  title: 'Preview',
  robots: { index: false, follow: false },
};

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const heroOnly = view === 'hero';

  /* The dropped three ride along with the full view too — they must be
     invisible whichever set they are mixed into. */
  const sections = heroOnly
    ? heroOnlySections
    : [...fixtureSections, ...droppedSections];

  return (
    <main className="min-h-full bg-bg text-text">
      <PageSection divided={false} className="py-24">
        <Stack direction="row" wrap align="baseline" justify="between" gapX="24" gapY="8">
          <Text variant="mono" tone="muted">
            /preview — {heroOnly ? 'hero only' : 'all twelve sections'},{' '}
            {sections.length} in the payload
          </Text>
          <Stack direction="row" wrap gapX="18" gapY="6">
            <Link href="/preview" variant="underline">
              Full portfolio
            </Link>
            <Link href="/preview?view=hero" variant="underline">
              Hero only
            </Link>
          </Stack>
        </Stack>
      </PageSection>

      <SectionRenderer sections={sections} />
    </main>
  );
}
