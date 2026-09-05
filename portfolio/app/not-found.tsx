import type { Metadata } from 'next';
import { Heading, PageSection, Stack, Text } from '@/components/ui';

/**
 * The branded 404 (FR-TEN-3).
 *
 * Byte-identical for every case: a slug that was never registered, one whose
 * owner has not published, one that has been unpublished, and one that is
 * suspended. That is why this component takes no props and reads nothing — it
 * has no input that could vary, so it cannot leak which case occurred. The
 * copy is deliberately about the address, not about an account.
 *
 * `noindex` keeps unpublished and suspended tenants out of search results
 * (FR-PUB-5).
 */
export const metadata: Metadata = {
  title: 'Not found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main id="main">
      <PageSection padding="hero" divided={false}>
        <Stack gap="stack-md" className="max-w-bio">
          <Text variant="eyebrow" tone="accent">
            404
          </Text>
          <Heading level={1} visual="heading">
            There is no portfolio at this address.
          </Heading>
          <Text variant="lead" tone="muted" balance>
            The address may be mistyped, or it may never have been in use.
          </Text>
        </Stack>
      </PageSection>
    </main>
  );
}
