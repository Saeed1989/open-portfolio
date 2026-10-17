import {
  REGISTRY,
  type GalleryContent,
  type GalleryItem,
} from '@portfolio/registry';
import {
  Card,
  Grid,
  Image,
  Link,
  SectionShell,
  Text,
} from '@/components/ui';
import { fieldRuns, renderRuns } from '../fields';

/**
 * Gallery. Alt text is required by the Image primitive's type, so an image
 * with no alt text cannot be rendered here.
 *
 * DEVIATION — video should be embedded by URL from a provider allowlist. A
 * provider iframe needs that allowlist enforced server-side first; until then
 * a video renders as a link out.
 */
const RENDERERS = {
  image: (item: GalleryItem) =>
    item.image ? (
      <Image
        src={item.image.src}
        alt={item.image.alt}
        width={item.image.width}
        height={item.image.height}
        radius="sm"
        className="aspect-shot w-full border border-border"
      />
    ) : null,

  caption: (item: GalleryItem) =>
    item.caption ? (
      <Text variant="caption" tone="muted" as="p" balance>
        {item.caption}
      </Text>
    ) : null,

  videoUrl: (item: GalleryItem) =>
    item.videoUrl ? (
      <Link href={item.videoUrl} variant="underline">
        Watch the video
      </Link>
    ) : null,
};

function GalleryEntry({ item }: { item: GalleryItem }) {
  const runs = fieldRuns(REGISTRY.gallery.itemFields, item, RENDERERS);

  return (
    <Card as="li" padding="roomy" radius="lg" className="flex flex-col gap-12">
      {renderRuns(runs)}
    </Card>
  );
}

export function Gallery({ content }: { content: GalleryContent }) {
  const items = content.items ?? [];

  return (
    <SectionShell id="gallery" heading={REGISTRY.gallery.label}>
      <Grid as="ul" tracks="cards" gap="grid-gap" alignStart>
        {items.map((item) => (
          <GalleryEntry key={item.id} item={item} />
        ))}
      </Grid>
    </SectionShell>
  );
}
