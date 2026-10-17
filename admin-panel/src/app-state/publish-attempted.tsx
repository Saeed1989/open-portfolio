import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  PublishAttemptedContext,
  type PublishAttemptedValue,
} from './publish-attempted-context';

/*
 * Whether a publish has been attempted in this session. `required` is
 * enforced only at publish, so a required-but-empty field stays a grey marker
 * and turns red only after a refused publish. App state rather than section
 * state, because a failed publish should redden every section's gaps.
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
