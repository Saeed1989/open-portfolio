import type { TrainingsContent } from '@portfolio/registry';

import { CredentialSection } from '../Achievements';

/**
 * Trainings reuses the achievements field schema, so it reuses the component
 * too: this file is an entry point, not an implementation. Label, field set
 * and render order come from the registry entry for `trainings`. The badge
 * treatment is gated on the descriptor declaring `credlyBadgeId`, which this
 * section's entry does not.
 */
export function Trainings({ content }: { content: TrainingsContent }) {
  return <CredentialSection sectionType="trainings" content={content} />;
}
