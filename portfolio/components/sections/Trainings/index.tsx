import type { TrainingsContent } from '@portfolio/registry';

import { CredentialSection } from '../Achievements';

/**
 * Trainings (business §11a, FR-SEC-TRN-1).
 *
 * Trainings reuses the achievements field schema verbatim, so it reuses the
 * component too — this file is an entry point, not an implementation, and
 * there is deliberately no second copy of the card markup to drift from the
 * first. Label, field set, and render order all come from the registry entry
 * for `trainings` (FR-REG-1, FR-REG-2).
 *
 * The import points at Achievements because that is where the shared
 * implementation lives, and because Credly belongs to achievements alone: the
 * badge path stays in the section that owns it rather than being hoisted into
 * a shared module that trainings would then carry for nothing.
 *
 * `TrainingsContent` is accepted here and passed straight through: the shared
 * component takes either content shape and reads items at the wider of the two
 * types. That is sound rather than lax — a training item is an achievement
 * item minus three optional Credly fields it never sets, and the badge
 * treatment is gated on the descriptor declaring `credlyBadgeId`, which this
 * section's entry deliberately does not.
 */
export function Trainings({ content }: { content: TrainingsContent }) {
  return <CredentialSection sectionType="trainings" content={content} />;
}
