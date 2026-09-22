import { useCallback, useEffect, useReducer, useRef } from 'react';
import { adminApi } from '../api/client';
import { AdminError } from '../api/errors';
import { readStaleWrite } from '../api/precondition';
import {
  DEBOUNCE_MS,
  INITIAL,
  reduce,
  type FailureKind,
  type SaveEvent,
  type SaveState,
} from './machine';

/*
 * D2's machine, wired to timers and the transport.
 *
 * Everything that decides *what state comes next* is in `machine.ts`. This
 * file only decides *when* — the debounce, the backoff timer, the flush on
 * Cmd+S and on leaving the route — and turns one `AdminError` into one
 * `FailureKind`. Keeping the split means the transitions are testable without
 * a DOM and the scheduling is testable without re-deriving the transitions.
 */

/** Maps a transport failure onto the three the machine distinguishes. */
export function classify(error: unknown): FailureKind {
  if (!(error instanceof AdminError)) return 'retryable';
  if (error.kind === 'stale_write') return 'stale';
  /* Permanent: the endpoint is unbuilt, so a retry is a loop. */
  if (error.kind === 'unsupported') return 'unsupported';
  /* A 422 on a *save* is a save-time content rule — the 3–5 project cap
     (FR-SEC-PROJ-2), an emptied impact field (FR-SEC-PROJ-5). It is not a
     publish gap, and there is nothing to retry. */
  if (error.kind === 'validation') return 'refused';
  return 'retryable';
}

export interface SectionSave {
  readonly state: SaveState;
  /** Call on every content change. Schedules a debounced write. */
  readonly edit: (content: unknown) => void;
  /** Send now — Cmd+S, or leaving the route. */
  readonly flush: () => void;
  /** "Retry now" on a failed save. */
  readonly retry: () => void;
  /** Dismiss a refusal without editing. */
  readonly dismiss: () => void;
  /** Take the server's copy after a stale write, discarding nothing silently. */
  readonly acceptServer: (content: unknown, version: number) => void;
  /** The local edits, for the "Copy my edits" affordance. */
  readonly pendingContent: () => unknown;
}

export interface UseSectionSaveOptions {
  readonly type: string;
  /** The document version this section was read at (D3). */
  readonly version: number | undefined;
  /** Called with the version the server reports after a successful write. */
  readonly onVersion?: ((version: number) => void) | undefined;
  /** Called when the server's copy is taken up after a stale write. */
  readonly onServerContent?: ((content: unknown, version: number) => void) | undefined;
}

export function useSectionSave({
  type,
  version,
  onVersion,
  onServerContent,
}: UseSectionSaveOptions): SectionSave {
  const [state, dispatch] = useReducer(reduce, INITIAL);

  /* Refs rather than state: these are read by timers and by the unmount
     flush, which must see the latest value without re-subscribing. */
  const pending = useRef<unknown>(undefined);
  const hasPending = useRef(false);
  const versionRef = useRef(version);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const backoff = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inFlight = useRef(false);

  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  const send = useCallback(
    (event: SaveEvent) => {
      dispatch(event);
    },
    [dispatch],
  );

  const write = useCallback(async () => {
    if (inFlight.current || !hasPending.current) return;

    const content = pending.current;
    inFlight.current = true;
    hasPending.current = false;
    send({ type: 'saveStarted' });

    try {
      const result = await adminApi.updateSection(
        type,
        { content },
        versionRef.current,
      );
      versionRef.current = result.version;
      onVersion?.(result.version);
      send({ type: 'saveSucceeded', at: Date.now() });
    } catch (cause) {
      const kind = classify(cause);
      const error = cause instanceof AdminError ? cause : undefined;

      /* The write did not land, so the content is pending again. */
      hasPending.current = true;

      send({
        type: 'saveFailed',
        kind,
        message: error?.message ?? 'The save did not complete.',
        ...(kind === 'refused' ? { fields: error?.fields ?? [] } : {}),
        ...(kind === 'stale'
          ? { stale: readStaleWrite(error?.payload) }
          : {}),
      });
    } finally {
      inFlight.current = false;
    }
  }, [type, send, onVersion]);

  const flush = useCallback(() => {
    clearTimeout(debounce.current);
    debounce.current = undefined;
    void write();
  }, [write]);

  const edit = useCallback(
    (content: unknown) => {
      pending.current = content;
      hasPending.current = true;
      send({ type: 'edit' });

      clearTimeout(debounce.current);
      debounce.current = setTimeout(() => {
        void write();
      }, DEBOUNCE_MS);
    },
    [send, write],
  );

  const retry = useCallback(() => {
    clearTimeout(backoff.current);
    backoff.current = undefined;
    send({ type: 'retry' });
    hasPending.current = true;
    void write();
  }, [send, write]);

  const dismiss = useCallback(() => {
    send({ type: 'dismiss' });
  }, [send]);

  const acceptServer = useCallback(
    (content: unknown, nextVersion: number) => {
      versionRef.current = nextVersion;
      pending.current = content;
      hasPending.current = false;
      onServerContent?.(content, nextVersion);
      send({ type: 'staleResolved', at: Date.now() });
    },
    [send, onServerContent],
  );

  /* The automatic retry of the failed state. The mock's "Retrying
     automatically in 8 seconds" is this timer. */
  useEffect(() => {
    if (state.status !== 'failed' || state.retryDelayMs === undefined) return;
    backoff.current = setTimeout(() => {
      send({ type: 'retry' });
      void write();
    }, state.retryDelayMs);
    return () => {
      clearTimeout(backoff.current);
    };
  }, [state.status, state.retryDelayMs, state.attempt, send, write]);

  /* A save landing after the request finished — the tenant typed while it was
     in flight — earns another one, without waiting for a fresh keystroke. */
  useEffect(() => {
    if (state.status !== 'saved' || !hasPending.current) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void write();
    }, DEBOUNCE_MS);
  }, [state.status, write]);

  /* Cmd+S / Ctrl+S flushes. The browser's own Save dialog is never what the
     tenant wanted on a page like this. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 's' || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      flush();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [flush]);

  /* Leaving the route flushes. Unmount is the last moment this component can
     send anything, so the debounce is not allowed to outlive it. */
  useEffect(() => {
    return () => {
      clearTimeout(debounce.current);
      clearTimeout(backoff.current);
      if (hasPending.current) void write();
    };
  }, [write]);

  return {
    state,
    edit,
    flush,
    retry,
    dismiss,
    acceptServer,
    pendingContent: () => pending.current,
  };
}
