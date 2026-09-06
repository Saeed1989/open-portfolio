import { REGISTRY, type ProjectsContent } from '@openportfolio/registry';
import { SectionShell, Text } from '@/components/ui';
import { ProjectGallery } from './ProjectGallery';

/**
 * Selected work (business req 2, FR-SEC-PROJ-*).
 *
 * FR-SEC-PROJ-6 asks for two depths. SRS §10.3 open question 3 settles which
 * two: the card is the fifteen-second read, and the full case study opens in a
 * dialog over the page — not on a route of its own. There is no URL for a
 * single project and no history entry, which is the accepted cost of the
 * pattern: project detail is not deep-linkable and not separately crawlable.
 *
 * The section stays a server component. Only the grid below it is a client
 * component, because only the grid needs to remember which card was clicked;
 * the heading, the count, and every card's content are still server-rendered
 * and still present in the initial HTML (FR-PUB-4).
 *
 * The 3–5 cap (FR-SEC-PROJ-2) is enforced by the API, not here — this renders
 * what it is given.
 */
export function Projects({ content }: { content: ProjectsContent }) {
  const items = content.items ?? [];

  return (
    <SectionShell
      id="projects"
      heading={REGISTRY.projects.label}
      aside={
        <Text variant="caption" tone="muted">
          {items.length} {items.length === 1 ? 'project' : 'projects'}
        </Text>
      }
    >
      <ProjectGallery items={items} />
    </SectionShell>
  );
}
