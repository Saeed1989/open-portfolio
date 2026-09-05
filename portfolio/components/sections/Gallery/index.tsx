import {
  REGISTRY,
  type GalleryContent,
  type GalleryItem,
} from '@openportfolio/registry';
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
 * Gallery (business req 12, FR-SEC-GAL-1).
 *
 * Alt text is required by the Image primitive's type, which is the same
 * guarantee FR-MED-5 enforces at upload — an image with no alt text cannot be
 * rendered here at all.
 *
 * DEVIATION — FR-SEC-GAL-1 asks for video *embedded* by URL from a provider
 * allowlist. A provider iframe is a third-party frame on a page that serves a
 * strict CSP (NFR-SEC-4) and would need the allowlist enforced server-side
 * before it is worth writing. Until then a video renders as a link out, which
 * loses nothing but the inline player.
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
