import { REGISTRY, type BlogContent, type BlogPost } from '@openportfolio/registry';
import {
  Card,
  Grid,
  Heading,
  Link,
  SectionShell,
  Stack,
  Text,
} from '@/components/ui';
import { fieldRuns, renderRuns, type RunWrappers } from '../fields';

/**
 * Writing (business req 7, FR-SEC-BLOG-1).
 *
 * Posts arrive already merged: the sync worker writes RSS results to the
 * integration cache and the API resolves manual values over synced ones
 * (FR-INT-4) before this ever runs. Nothing here knows or cares which is
 * which, and no feed is fetched during a render (FR-INT-1).
 */
const RENDERERS = {
  date: (post: BlogPost) =>
    post.date ? (
      <Text variant="meta" tone="muted">
        {post.date}
      </Text>
    ) : null,

  title: (post: BlogPost) =>
    post.title ? (
      <Heading level={3} visual="card">
        {post.title}
      </Heading>
    ) : null,

  summary: (post: BlogPost) =>
    post.summary ? (
      <Text variant="body" tone="muted" balance>
        {post.summary}
      </Text>
    ) : null,

  url: (post: BlogPost) =>
    post.url ? (
      <Link href={post.url} variant="underline">
        Read the post
      </Link>
    ) : null,
};

const WRAPPERS: RunWrappers = {
  meta: (nodes) => (
    <Stack direction="row" wrap align="baseline" gapX="10" gapY="6">
      {nodes}
    </Stack>
  ),
  links: (nodes) => (
    <Stack direction="row" wrap gapX="18" gapY="6" className="mt-auto pt-4">
      {nodes}
    </Stack>
  ),
};

function Post({ post }: { post: BlogPost }) {
  const runs = fieldRuns(REGISTRY.blog.itemFields, post, RENDERERS);

  return (
    <Card as="li" padding="roomy" radius="lg" className="flex flex-col gap-10">
      {renderRuns(runs, WRAPPERS)}
    </Card>
  );
}

export function Blog({ content }: { content: BlogContent }) {
  const items = content.items ?? [];

  return (
    <SectionShell id="blog" heading={REGISTRY.blog.label}>
      <Grid as="ul" tracks="cards" gap="grid-gap">
        {items.map((post) => (
          <Post key={post.id} post={post} />
        ))}
      </Grid>
    </SectionShell>
  );
}
