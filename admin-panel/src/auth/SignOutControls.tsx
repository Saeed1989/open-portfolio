import { useState } from 'react';
import { authApi } from '../api/client';
import { Button } from '../ui/primitives';
import { goToSignIn } from './navigation';

/**
 * FR-AUTH-14: sign out of this session, or of every session.
 *
 * Either one ends at sign-in whether or not the call succeeded: the tenant
 * asked to leave, and the navigation drops everything this page held.
 */
export function SignOutControls() {
  const [pending, setPending] = useState(false);

  const run = (request: () => Promise<undefined>) => {
    setPending(true);
    const leave = () => {
      goToSignIn();
    };
    request().then(leave, leave);
  };

  return (
    <div className="flex items-center gap-[8px]">
      <Button
        sm
        variant="ghost"
        disabled={pending}
        onClick={() => {
          run(authApi.logoutAll);
        }}
      >
        Sign out everywhere
      </Button>
      <Button
        sm
        disabled={pending}
        onClick={() => {
          run(authApi.logout);
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
