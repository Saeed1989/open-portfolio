import { Link, Text } from '@/components/ui';

/**
 * Placeholder. The real page renders a portfolio by walking its ordered
 * section array and dispatching each entry to the component registered for its
 * type — no section components exist yet.
 */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-content px-gutter py-section-y">
      <Text variant="body" tone="muted">
        No portfolio is wired up yet. The primitives are on the{' '}
        <Link href="/styleguide">styleguide</Link>.
      </Text>
    </main>
  );
}
