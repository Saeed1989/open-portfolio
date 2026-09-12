'use client';

import { Heading, PageSection, Stack, Text } from '@/components/ui';

/**
 * The generic error state.
 *
 * Everything the data layer can fail on lands here: a non-2xx from the public
 * API, a network failure reaching it, or a payload that fails validation. The
 * page throws, this renders in its place, and the document survives — the
 * layout has already fallen back to the default theme rather than depending on
 * the payload, so the branding around this copy is intact.
 *
 * Deliberately says nothing about the cause, for the same reason the 404 does
 * not (FR-TEN-3): a visitor must not be able to tell an upstream outage from a
 * malformed payload, nor learn whether the slug is registered. The thrown
 * error stays server-side; Next sends only a digest.
 *
 * No retry, and no reset button. The render already failed once and this file
 * cannot know whether the cause was transient, so reloading is the visitor's
 * call. `'use client'` is Next's contract for an error boundary, not a data
 * dependency — this component reads nothing and takes no props.
 */
export default function PortfolioError() {
  return (
    <main id="main">
      <PageSection padding="hero" divided={false}>
        <Stack gap="stack-md" className="max-w-bio">
          <Text variant="eyebrow" tone="accent">
            Error
          </Text>
          <Heading level={1} visual="heading">
            This portfolio could not be loaded.
          </Heading>
          <Text variant="lead" tone="muted" balance>
            Something went wrong at our end. Please try again in a moment.
          </Text>
        </Stack>
      </PageSection>
    </main>
  );
}
