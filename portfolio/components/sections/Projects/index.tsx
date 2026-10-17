import { REGISTRY, type ProjectsContent } from '@portfolio/registry';
import { SectionShell } from '@/components/ui';
import { ProjectGallery } from './ProjectGallery';

/**
 * Selected work, at two depths: the card is the fifteen-second read, and the
 * full case study opens in a dialog over the page. There is no URL for a
 * single project, so project detail is not deep-linkable.
 *
 * The section stays a server component. Only the grid below it is a client
 * component, because only the grid remembers which card was clicked.
 *
 * The item cap is enforced by the API, not here.
 */
export function Projects({ content }: { content: ProjectsContent }) {
  return (
    /*
     * No `aside` count here. The count moves with the filter, so it belongs
     * beside the filter in the client component — stating a total next to the
     * heading while the grid shows a subset would simply be wrong.
     */
    <SectionShell id="projects" heading={REGISTRY.projects.label}>
      <ProjectGallery
        items={content.items ?? []}
        categories={content.categories}
      />
    </SectionShell>
  );
}
