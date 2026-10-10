import { useState } from 'react';
import { authApi } from '../api/client';
import { Button } from '../ui/primitives';
import { goToSignIn } from './navigation';

/**
 * FR-AUTH-14: sign out of this session, or of every session.
 *
 * Either one ends at sign-in only once the server has answered, so a request
 * that failed never leaves the tenant believing a live session was revoked.
 */
export function SignOutControls() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const run = (request: () => Promise<undefined>) => {
    setPending(true);
    setFailed(false);
    request().then(goToSignIn, () => {
      setPending(false);
      setFailed(true);
    });
  };

  return (
    <div className="flex items-center gap-[8px]">
      {failed ? (
        <span role="alert" className="font-sans text-[11.5px] text-danger">
          Could not sign out. Try again.
        </span>
      ) : null}
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
