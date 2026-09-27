import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  PublishAttemptedContext,
  type PublishAttemptedValue,
} from './publish-attempted-context';

/*
 * Whether a publish has been attempted in this session.
 *
 * This one boolean is the whole of the pending/blocking distinction. FR-REG-8
 * defers `required` to publish, so a required-but-empty field is a grey dotted
 * marker while the tenant writes and turns red only once they have asked to
 * publish and been told no. Without the flag every new portfolio opens as a
 * wall of errors.
 *
 * It is app state rather than section state because publish is a
 * portfolio-level act: attempting it and failing should redden every section's
 * gaps, not only the one that happened to be open.
 *
 * It lives here rather than in the publish flow because the publish flow is
 * not built in this milestone. When it is, it sets this flag on a failed
 * attempt and nothing else changes.
 */

export function PublishAttemptedProvider({ children }: { children: ReactNode }) {
  const [attempted, set] = useState(false);
  const setAttempted = useCallback((value: boolean) => {
    set(value);
  }, []);
  const value: PublishAttemptedValue = useMemo(
    () => ({ attempted, setAttempted }),
    [attempted, setAttempted],
  );
  return (
    <PublishAttemptedContext.Provider value={value}>
      {children}
    </PublishAttemptedContext.Provider>
  );
}
