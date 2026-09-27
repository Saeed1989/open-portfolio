import { useEffect, useState } from 'react';
import { adminApi } from '../api/client';
import { AdminError } from '../api/errors';
import type { Me } from '../api/dto';
import {
  FAULTS,
  mockState,
  setMockState,
  type Fault,
} from '../mocks/state';
import { TENANT_NAMES } from '../mocks/tenants';
import { Button, Card, Pill } from '../ui/primitives';
import { FieldMatrix } from './FieldMatrix';

/*
 * /dev/fields — the living reference the rest of the build is checked against.
 *
 * Light and dark side by side on one page, because the thing that goes wrong
 * is a token that was only ever looked at in one of them. The dark half is a
 * `.dark` container rather than a second document: the token file redeclares
 * its custom properties under that class, so a subtree gets the dark values
 * with no `dark:` variant on any component.
 *
 * The header also drives the mock server, so the fault modes of §7.2 are
 * reachable without a restart, and shows what `GET /admin/me` currently
 * answers — which is the one call this milestone has to get all the way
 * through `edge`.
 */
export function DevFields() {
  return (
    <div className="min-h-screen bg-bg px-[24px] py-[20px]">
      <header className="mb-[20px] flex flex-col gap-[12px]">
        <div className="flex flex-wrap items-baseline gap-[10px]">
          <h1 className="m-0 font-sans text-[17px] font-semibold leading-[1.3] text-ink">
            Field system
          </h1>
          <p className="m-0 font-sans text-[12px] leading-[1.5] text-ink2">
            Eleven components, seven states, one invalid treatment and one focus
            ring. Light and dark are the same components under two token sets.
          </p>
        </div>
        <MockBar />
      </header>

      {/* The matrix is this page's main content, and a document with none is
          one a screen-reader user cannot skip the header of. */}
      <main className="grid grid-cols-1 gap-[20px] xl:grid-cols-2">
        <ThemeHalf label="Light" />
        <ThemeHalf label="Dark" dark />
      </main>
    </div>
  );
}

function ThemeHalf({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <section
      aria-labelledby={`${label}-theme`}
      className={`${dark ? 'dark' : ''} rounded-card border border-line bg-bg p-[18px]`}
    >
      {/* An h2 rather than a styled span: the component headings below are
          h3, and a page that jumps h1 to h3 is one a screen reader reads as
          having a level missing. */}
      <h2
        id={`${label}-theme`}
        className="mb-[16px] flex items-center gap-[8px]"
      >
        <Pill tone={dark ? 'neutral' : 'accent'}>{label} theme</Pill>
      </h2>
      <FieldMatrix idPrefix={dark ? 'dark' : 'light'} />
    </section>
  );
}

/** Drives the MSW handlers, and shows what /admin/me answers right now. */
function MockBar() {
  const [state, setState] = useState(mockState());
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<AdminError | null>(null);
  const [pending, setPending] = useState(false);

  const load = () => {
    setPending(true);
    setMe(null);
    setError(null);
    adminApi
      .me()
      .then(setMe)
      .catch((cause: unknown) => {
        setError(
          cause instanceof AdminError
            ? cause
            : new AdminError({
                kind: 'network',
                status: 0,
                message: String(cause),
              }),
        );
      })
      .finally(() => {
        setPending(false);
      });
  };

  useEffect(load, []);

  return (
    <Card className="flex flex-wrap items-end gap-[14px] p-[12px]">
      <label className="flex flex-col gap-[4px]">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink3">
          Tenant
        </span>
        <select
          value={state.tenant}
          onChange={(event) => {
            setState(
              setMockState({
                tenant: event.target.value as typeof state.tenant,
              }),
            );
          }}
          className="rounded-field border border-line-strong bg-field px-[9px] py-[6px] font-sans text-[12px] text-ink"
        >
          {TENANT_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value="no-portfolio">no portfolio</option>
        </select>
      </label>

      <label className="flex flex-col gap-[4px]">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink3">
          Fault
        </span>
        <select
          value={state.fault}
          onChange={(event) => {
            setState(setMockState({ fault: event.target.value as Fault }));
          }}
          className="rounded-field border border-line-strong bg-field px-[9px] py-[6px] font-sans text-[12px] text-ink"
        >
          {FAULTS.map((fault) => (
            <option key={fault} value={fault}>
              {fault}
            </option>
          ))}
        </select>
      </label>

      <Button onClick={load} disabled={pending}>
        GET /api/admin/me
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-[8px]">
        {pending ? (
          <Pill tone="neutral">loading</Pill>
        ) : error ? (
          <>
            <Pill tone="danger">
              {error.status === 0 ? 'network' : String(error.status)}
            </Pill>
            <span className="truncate font-mono text-[11px] text-ink2">
              {error.kind} — {error.message}
            </span>
          </>
        ) : me ? (
          <>
            <Pill tone="ok">200</Pill>
            <span className="truncate font-mono text-[11px] text-ink2">
              {me.displayName} · {me.portfolio?.slug ?? 'no portfolio'}
              {me.portfolio ? ` · ${me.portfolio.status}` : ''}
            </span>
          </>
        ) : null}
      </div>
    </Card>
  );
}
