import { createContext, useContext } from 'react';

/*
 * The context behind `PublishAttemptedProvider`, and the hook that reads it.
 *
 * Split from the provider so that file exports only a component — React Fast
 * Refresh cannot update a module that mixes components with other exports, and
 * losing hot reload on app state is a bad trade for one fewer file.
 */

export interface PublishAttemptedValue {
  readonly attempted: boolean;
  readonly setAttempted: (value: boolean) => void;
}

export const PublishAttemptedContext = createContext<PublishAttemptedValue>({
  attempted: false,
  setAttempted: () => undefined,
});

export function usePublishAttempted(): PublishAttemptedValue {
  return useContext(PublishAttemptedContext);
}
