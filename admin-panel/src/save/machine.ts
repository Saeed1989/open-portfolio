import type { FieldError } from '../api/errors';

/*
 * The save model, in one module.
 *
 * Manual save: the Save button or Cmd+S sends one PATCH per section. There is
 * no "Discard changes": a draft is the tenant's working copy and publish is
 * the gate.
 *
 *   idle     nothing sent this session
 *   saving   a PATCH is in flight; Publish is held so it cannot race a write
 *   saved    a timestamp; `required` was not validated, so an incomplete
 *            draft still reads as saved
 *   failed   the server was not reached, or answered 5xx; the edits are held
 *            and retried with backoff
 *   refused  the server rejected the write on content. Nothing to retry
 *   stale    the precondition failed: the server moved. Neither copy is
 *            thrown away
 *   unsupported  the server does not implement this write. Nothing to retry;
 *            the edits are held and stay copyable
 *
 * Pure. Timers, fetches and React live in `useSectionSave`.
 */

export type SaveStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'failed'
  | 'refused'
  | 'stale'
  /** The server does not implement this write. Nothing to retry, and nothing
   *  the tenant can change — see `FailureKind`. */
  | 'unsupported';

export interface StaleSnapshot {
  /** The document as the server now holds it. */
  readonly current: unknown;
  readonly currentVersion: number | undefined;
}

export interface SaveState {
  readonly status: SaveStatus;
  /** Edits made but not yet sent. */
  readonly dirty: boolean;
  /** When the current `saved` status was reached. */
  readonly savedAt: number | undefined;
  /**
   * The last save that succeeded, kept across a failure so the failed state
   * can say "last successful save 14:28" rather than only "failed".
   */
  readonly lastSavedAt: number | undefined;
  /** Consecutive failures. Drives the backoff and resets on success. */
  readonly attempt: number;
  /** How long until the automatic retry, in `failed`. */
  readonly retryDelayMs: number | undefined;
  /** Human-readable reason, in `failed` and `refused`. */
  readonly message: string | undefined;
  /** Field-level errors from a refusal, addressed by path. */
  readonly fields: readonly FieldError[];
  readonly stale: StaleSnapshot | undefined;
}

export const INITIAL: SaveState = {
  status: 'idle',
  dirty: false,
  savedAt: undefined,
  lastSavedAt: undefined,
  attempt: 0,
  retryDelayMs: undefined,
  message: undefined,
  fields: [],
  stale: undefined,
};

/**
 * Backoff for the retry of a `failed` save: 1s, 2s, 4s, 8s, 16s, then 30s.
 *
 * Capped rather than unbounded because the failure this covers is usually a
 * network that comes back, and a tab left open overnight should still be
 * trying at a sane interval when it does.
 */
export function backoffMs(attempt: number): number {
  return Math.min(30_000, 1000 * 2 ** Math.max(0, attempt - 1));
}

/**
 * Why a save failed, already classified by the transport.
 *
 * `retryable` is the only one that earns a retry. `refused` has a remedy the
 * tenant controls (change the content); `unsupported` and `stale` do not, and
 * retrying either is a loop rather than a recovery.
 */
export type FailureKind = 'retryable' | 'refused' | 'stale' | 'unsupported';

export type SaveEvent =
  /** The tenant changed something. */
  | { readonly type: 'edit' }
  /** A PATCH has just been sent. */
  | { readonly type: 'saveStarted' }
  | { readonly type: 'saveSucceeded'; readonly at: number }
  | {
      readonly type: 'saveFailed';
      readonly kind: FailureKind;
      readonly message: string;
      readonly fields?: readonly FieldError[];
      readonly stale?: StaleSnapshot;
    }
  /** "Retry now", or the backoff timer firing. */
  | { readonly type: 'retry' }
  /** The tenant dismissed a refusal without editing. */
  | { readonly type: 'dismiss' }
  /** The stale state was resolved — the server's version was taken up. */
  | { readonly type: 'staleResolved'; readonly at: number };

export function reduce(state: SaveState, event: SaveEvent): SaveState {
  switch (event.type) {
    case 'edit':
      /*
       * An edit clears a refusal. `refused` means the server rejected this
       * content and there is nothing to retry — changing the content is the
       * only move, so making it is what dismisses the message. A failed save
       * keeps its state: the edits are still queued behind the same retry.
       */
      return {
        ...state,
        dirty: true,
        ...(state.status === 'refused'
          ? {
              status: state.lastSavedAt === undefined ? 'idle' : 'saved',
              message: undefined,
              fields: [],
              savedAt: state.lastSavedAt,
            }
          : {}),
      };

    case 'saveStarted':
      /* The edits are now in flight, so the buffer is clean. An edit landing
         during the request sets `dirty` again and earns another save. */
      return { ...state, status: 'saving', dirty: false };

    case 'saveSucceeded':
      return {
        ...state,
        status: 'saved',
        savedAt: event.at,
        lastSavedAt: event.at,
        attempt: 0,
        retryDelayMs: undefined,
        message: undefined,
        fields: [],
        stale: undefined,
      };

    case 'saveFailed': {
      /* The edits went nowhere, so they are pending again in every case —
         none of the three failures may silently drop what the tenant typed. */
      const base = { ...state, dirty: true, message: event.message };

      if (event.kind === 'refused') {
        return {
          ...base,
          status: 'refused',
          fields: event.fields ?? [],
          attempt: 0,
          retryDelayMs: undefined,
        };
      }

      if (event.kind === 'unsupported') {
        /* The edits stay pending and stay copyable — the tenant's work is
           not at fault and must not be thrown away because the server is
           incomplete. No backoff: this will not start working. */
        return {
          ...base,
          status: 'unsupported',
          fields: [],
          attempt: 0,
          retryDelayMs: undefined,
        };
      }

      if (event.kind === 'stale') {
        return {
          ...base,
          status: 'stale',
          stale: event.stale,
          fields: [],
          attempt: 0,
          retryDelayMs: undefined,
        };
      }

      const attempt = state.attempt + 1;
      return {
        ...base,
        status: 'failed',
        fields: [],
        attempt,
        retryDelayMs: backoffMs(attempt),
      };
    }

    case 'retry':
      return { ...state, status: 'saving', dirty: false };

    case 'dismiss':
      return {
        ...state,
        status: state.lastSavedAt === undefined ? 'idle' : 'saved',
        savedAt: state.lastSavedAt,
        message: undefined,
        fields: [],
        stale: undefined,
      };

    case 'staleResolved':
      return {
        ...state,
        status: 'saved',
        /* The server's copy replaced the local edits; nothing is unsent. */
        dirty: false,
        savedAt: event.at,
        lastSavedAt: event.at,
        stale: undefined,
        message: undefined,
        fields: [],
        attempt: 0,
        retryDelayMs: undefined,
      };
  }
}

/**
 * Whether a write is in flight.
 *
 * Exposed for the Publish button this milestone does not build: artboard 39
 * holds Publish disabled while a save is running "so a publish cannot race a
 * write".
 */
export function isSaving(state: SaveState): boolean {
  return state.status === 'saving';
}

/**
 * Whether the tenant has work this tab has not managed to send.
 *
 * True while edits are unsent and true through every failure, which is
 * what a beforeunload guard would read.
 */
export function hasUnsavedWork(state: SaveState): boolean {
  return (
    state.dirty ||
    state.status === 'failed' ||
    state.status === 'refused' ||
    state.status === 'stale' ||
    state.status === 'unsupported'
  );
}
