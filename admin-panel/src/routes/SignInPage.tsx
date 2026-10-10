import { useSearchParams } from 'react-router';
import { safeReturnTo } from '../auth/navigation';
import { Pill } from '../ui/primitives';

interface Failure {
  readonly pill: string;
  readonly title: string;
  readonly detail: string;
}

/* The two codes §2.5 redirects here with. The copy is keyed by code and the
   query value itself is never rendered. */
const AUTH_FAILED: Failure = {
  pill: 'Sign-in failed',
  title: 'Could not complete sign-in',
  detail:
    'Nothing was created and no session exists. Retrying starts a fresh authorisation.',
};
const FAILURES: Record<string, Failure> = {
  auth_failed: AUTH_FAILED,
  account_suspended: {
    pill: 'Sign-in refused',
    title: 'This account is suspended',
    detail:
      'No session was created and your portfolio is not reachable. This is not something you can clear from here.',
  },
};

const START = '/api/auth/google/start';

/**
 * §2.5 step 1. The link is a navigation, not a fetch: the OAuth round trip is
 * a chain of top-level redirects that ends with `api` setting the cookies and
 * sending the browser back to the app, where FR-AUTH-7 takes over.
 */
export function SignInPage() {
  const [params] = useSearchParams();
  const error = params.get('error');
  const failure = error === null ? undefined : (FAILURES[error] ?? AUTH_FAILED);
  const returnTo = safeReturnTo(params.get('returnTo'));

  return (
    <main className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center gap-[22px] p-[32px]">
      {failure === undefined ? (
        <div>
          <h1 className="m-0 font-sans text-[21px] font-semibold leading-[1.3] text-ink">
            Sign in
          </h1>
          <p className="m-0 mt-[6px] font-sans text-[13px] leading-[1.5] text-ink2">
            One portfolio per account.
          </p>
        </div>
      ) : (
        <div role="alert">
          <Pill tone="danger">{failure.pill}</Pill>
          <h1 className="m-0 mt-[7px] font-sans text-[21px] font-semibold leading-[1.3] text-ink">
            {failure.title}
          </h1>
          <p className="m-0 mt-[6px] font-sans text-[13px] leading-[1.5] text-ink2">
            {failure.detail}
          </p>
        </div>
      )}
      <a
        href={
          returnTo === null
            ? START
            : `${START}?returnTo=${encodeURIComponent(returnTo)}`
        }
        className="inline-flex items-center justify-center rounded-field border border-line-strong bg-surface px-[14px] py-[11px] font-sans text-[13px] font-medium leading-[1.2] text-ink no-underline hover:border-ink3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Sign in with Google
      </a>
      <p className="m-0 font-sans text-[11.5px] leading-[1.5] text-ink3">
        First sign-in creates an account and nothing else.
      </p>
    </main>
  );
}
