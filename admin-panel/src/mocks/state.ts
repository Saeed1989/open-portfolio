import { TENANT_NAMES, type TenantName } from './tenants';

/*
 * What the mock server is currently pretending, switchable while the app runs.
 *
 * A fault the developer has to restart to reach is a fault nobody exercises,
 * and the five of §7.2 plus a failing sync are the states the forms are
 * actually shaped by. Held in localStorage so a reload keeps the fault the
 * developer was looking at, and mirrored onto `window.__mocks` so it can be
 * driven from the console as well as the toolbar.
 */

export type Fault =
  | 'none'
  /** No session. `edge` answers this before the admin surface (FR-EDGE-3). */
  | 'unauthorized'
  /** 409 on create — the tenant already has a portfolio (§7.2). */
  | 'portfolio_exists'
  /** 409 on create or slug change, as a field error on `slug`. */
  | 'slug_taken'
  /** 422 with field-level errors (FR-API-4, FR-PUB-6). */
  | 'validation'
  /** 500 from the admin surface. */
  | 'server'
  /** The RSS connection is failing: last good payload still served, entry
   *  marked stale (FR-INT-3). Not an HTTP failure — the admin surface answers
   *  200 and the failure is in the payload. */
  | 'rss_sync_failing';

export const FAULTS: readonly Fault[] = [
  'none',
  'unauthorized',
  'portfolio_exists',
  'slug_taken',
  'validation',
  'server',
  'rss_sync_failing',
];

export interface MockState {
  /** Which tenant `edge`'s stubbed X-User-Id stands for. */
  readonly tenant: TenantName | 'no-portfolio';
  readonly fault: Fault;
}

const KEY = 'openfolio.mocks';
const DEFAULT: MockState = { tenant: 'alice', fault: 'none' };

let current: MockState = read();

function isTenant(value: unknown): value is MockState['tenant'] {
  return (
    value === 'no-portfolio' ||
    TENANT_NAMES.some((name) => name === value)
  );
}

function isFault(value: unknown): value is Fault {
  return FAULTS.some((fault) => fault === value);
}

function read(): MockState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return DEFAULT;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT;
    const { tenant, fault } = parsed as Partial<MockState>;
    return {
      tenant: isTenant(tenant) ? tenant : DEFAULT.tenant,
      fault: isFault(fault) ? fault : DEFAULT.fault,
    };
  } catch {
    return DEFAULT;
  }
}

export function mockState(): MockState {
  return current;
}

export function setMockState(next: Partial<MockState>): MockState {
  current = { ...current, ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* Private mode, or storage disabled. The state still holds in memory. */
  }
  return current;
}

declare global {
  interface Window {
    __mocks?: {
      state: () => MockState;
      set: (next: Partial<MockState>) => MockState;
    };
  }
}

export function exposeToConsole(): void {
  window.__mocks = { state: mockState, set: setMockState };
}
