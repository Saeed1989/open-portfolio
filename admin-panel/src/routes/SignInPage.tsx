import { useSearchParams } from 'react-router';

/** The two codes §2.5 redirects here with. Anything else shows nothing. */
const FAILURES: Record<string, string> = {
  auth_failed: 'Could not complete sign-in. Try again.',
  account_suspended: 'This account is suspended.',
};

/**
 * §2.5 step 1. The link is a navigation, not a fetch: the OAuth round trip is
 * a chain of top-level redirects that ends with `api` setting the cookies and
 * sending the browser back to the app, where FR-AUTH-7 takes over.
 */
export function SignInPage() {
  const [params] = useSearchParams();
  const failure = FAILURES[params.get('error') ?? ''];

  return (
    <main className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center gap-[22px] p-[32px]">
      <div>
        <h1 className="m-0 font-sans text-[21px] font-semibold leading-[1.3] text-ink">
          Sign in
        </h1>
        <p className="m-0 mt-[6px] font-sans text-[13px] leading-[1.5] text-ink2">
          One portfolio per account.
        </p>
      </div>
      {failure === undefined ? null : (
        <p
          id="sign-in-error"
          role="alert"
          className="m-0 font-sans text-[13px] leading-[1.5] text-danger"
        >
          {failure}
        </p>
      )}
      <a
        href="/api/auth/google/start"
        className="inline-flex items-center justify-center rounded-field border border-line-strong bg-surface px-[14px] py-[11px] font-sans text-[13px] font-medium leading-[1.2] text-ink no-underline hover:border-ink3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Continue with Google
      </a>
      <p className="m-0 font-sans text-[11.5px] leading-[1.5] text-ink3">
        First sign-in creates an account and nothing else.
      </p>
    </main>
  );
}
