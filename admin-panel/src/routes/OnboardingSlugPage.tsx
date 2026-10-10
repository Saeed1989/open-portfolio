import { useEffect, useState, type FormEvent } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { adminApi } from '../api/client';
import type { Me } from '../api/dto';
import { AdminError } from '../api/errors';
import { isWellFormedSlug, normaliseSlug, SLUG_SUFFIX } from '../api/slug';
import { DASHBOARD_PATH, ME_QUERY_KEY, useMe } from '../app-state/me';
import { SignOutControls } from '../auth/SignOutControls';
import { SlugField } from '../fields/SlugField';
import { TextInput } from '../fields/TextInput';
import { Button, Card, Pill } from '../ui/primitives';

/*
 * Artboard E1 — claim a subdomain, which creates the portfolio
 * (FR-AUTH-5, FR-AUTH-7, §7.2).
 *
 * The availability check is advice, worded as advice: only the write decides,
 * so a slug shown as available can still be lost at submit (the race-lost
 * state). Every rule here is checked again by `api`.
 */

const DEBOUNCE_MS = 400;

const MESSAGES = {
  rules: 'Lowercase letters, digits and hyphens. 3 to 63 characters.',
  invalid:
    'Lowercase letters, digits and single hyphens only, 3 to 63 characters, and it cannot start or end with a hyphen.',
  reserved: 'Reserved for the platform, so it cannot be claimed by anyone.',
  taken: 'Taken — either in use or held in another portfolio’s slug history.',
  raceLost:
    'Claimed by someone else while you were on this screen. Nothing you typed is lost — pick another subdomain and submit again.',
  checking: 'Checking availability…',
  available: 'Available. Advisory only; the claim itself is what decides.',
  rateLimited: 'Too many checks in a minute. Wait a moment — you can still submit.',
  unchecked: 'Could not check availability — you can still submit.',
} as const;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, ms);
    return () => {
      clearTimeout(timer);
    };
  }, [value, ms]);
  return debounced;
}

interface SlugStatus {
  readonly error?: string;
  readonly note?: string;
}

export function OnboardingSlugPage() {
  const me = useMe().data as Me;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = useState(me.displayName);
  const [rawSlug, setRawSlug] = useState('');
  /** The last refused claim, shown until the slug it was for is edited. */
  const [rejected, setRejected] = useState<{
    slug: string;
    error: AdminError;
  } | null>(null);

  const slug = normaliseSlug(rawSlug);
  const wellFormed = isWellFormedSlug(slug);
  const debounced = useDebounced(slug, DEBOUNCE_MS);

  const availability = useQuery({
    queryKey: ['slug-availability', debounced],
    queryFn: ({ signal }) => adminApi.slugAvailability(debounced, signal),
    enabled: isWellFormedSlug(debounced),
    retry: false,
  });

  const claim = useMutation({
    mutationFn: () =>
      adminApi.createPortfolio(
        name.trim() === '' ? { slug } : { slug, name: name.trim() },
      ),
    onSuccess: (portfolio) => {
      queryClient.setQueryData<Me>(ME_QUERY_KEY, {
        ...me,
        portfolio: { slug: portfolio.slug, status: portfolio.status },
      });
      void navigate(DASHBOARD_PATH, { replace: true });
    },
    onError: (error) => {
      if (error instanceof AdminError) setRejected({ slug, error });
    },
  });

  const refusal = rejected?.slug === slug ? rejected.error : null;
  const status = slugStatus();

  function slugStatus(): SlugStatus {
    if (slug === '') return {};
    if (refusal?.kind === 'slug_taken') return { error: MESSAGES.raceLost };
    if (refusal?.code === 'slug_reserved') return { error: MESSAGES.reserved };
    if (refusal?.code === 'slug_invalid') return { error: MESSAGES.invalid };
    if (!wellFormed) return { error: MESSAGES.invalid };
    /* No verdict while in flight, so a stale answer never flashes. */
    if (debounced !== slug || availability.isFetching) {
      return { note: MESSAGES.checking };
    }
    if (availability.isError) {
      return {
        note:
          availability.error instanceof AdminError &&
          availability.error.kind === 'rate_limited'
            ? MESSAGES.rateLimited
            : MESSAGES.unchecked,
      };
    }
    switch (availability.data?.status) {
      case 'invalid':
        return { error: MESSAGES.invalid };
      case 'reserved':
        return { error: MESSAGES.reserved };
      case 'taken':
        return { error: MESSAGES.taken };
      case 'available':
        return { note: MESSAGES.available };
      default:
        return {};
    }
  }

  const slugHint =
    slug === ''
      ? MESSAGES.rules
      : [`${slug}${SLUG_SUFFIX}`, status.note].filter(Boolean).join(' · ');

  /* Refusals the slug field does not show. */
  const formError =
    refusal === null ||
    refusal.kind === 'slug_taken' ||
    refusal.kind === 'portfolio_exists' ||
    refusal.code === 'slug_reserved' ||
    refusal.code === 'slug_invalid'
      ? null
      : refusal.kind === 'rate_limited'
        ? 'Too many requests. Wait a moment and try again.'
        : `Could not create your portfolio. ${refusal.message}`;

  /* A verdict the field shows as an error blocks submit; a pending, failed or
     rate-limited check does not — the write is what decides. */
  const canSubmit =
    wellFormed && status.error === undefined && !claim.isPending;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (canSubmit) claim.mutate();
  }

  if (refusal?.kind === 'portfolio_exists') {
    return (
      <main className="mx-auto flex max-w-[720px] flex-col gap-[14px] p-[32px]">
        <div>
          <Pill tone="accent">Already claimed</Pill>
          <h1 className="m-0 mt-[7px] font-sans text-[17px] font-semibold leading-[1.3] text-ink">
            You already have a portfolio
          </h1>
        </div>
        <p className="m-0 font-sans text-[13px] leading-[1.5] text-ink2">
          One portfolio per account, so there is nothing to create.
        </p>
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
            }}
          >
            Go to dashboard
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-[17px] p-[32px]">
      <div className="flex justify-end">
        <SignOutControls />
      </div>
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink3">
          Signed in as {me.email} · step 1 of 1
        </span>
        <h1 className="m-0 mt-[6px] font-sans text-[17px] font-semibold leading-[1.3] text-ink">
          Claim your portfolio
        </h1>
        <p className="m-0 mt-[4px] font-sans text-[13px] leading-[1.5] text-ink2">
          Two things now. Everything else is editable afterwards.
        </p>
      </div>

      <form className="flex flex-col gap-[17px]" onSubmit={submit} noValidate>
        <TextInput
          id="onboarding-name"
          label="Display name"
          optional
          hint="Shown as the name on your portfolio. Editable later."
          value={name}
          onChange={setName}
        />
        <SlugField
          id="onboarding-slug"
          label="Subdomain"
          required
          placeholder="yourname"
          value={rawSlug}
          onChange={setRawSlug}
          hint={slugHint}
          error={status.error}
        />
        {/* The field's hint and error are not live regions; this announces
            the verdict once it settles. */}
        <p className="sr-only" aria-live="polite">
          {status.error ?? status.note ?? ''}
        </p>

        {formError ? (
          <Card className="border-danger bg-danger-soft px-[13px] py-[11px]">
            <p role="alert" className="m-0 font-sans text-[12px] text-danger">
              {formError}
            </p>
          </Card>
        ) : null}

        <div className="flex items-center justify-end gap-[8px]">
          <span className="mr-auto font-mono text-[10px] text-ink3">
            Nothing is written until this succeeds
          </span>
          <Button type="submit" variant="primary" disabled={!canSubmit}>
            {claim.isPending ? 'Claiming…' : 'Claim subdomain'}
          </Button>
        </div>
      </form>
    </main>
  );
}
