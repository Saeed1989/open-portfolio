/*
 * Optimistic concurrency, in one module.
 *
 * Every draft write carries `If-Match: <draftRevision>` — the revision `api`
 * returns with the portfolio and increments on every draft write. It is not
 * `version`, which moves only when `published` is written. A stale write is
 * refused with `409 stale_write` and the current revision; the client
 * refetches the draft to show what changed.
 *
 * The revision is per draft, not per section: two sections edited in two
 * tabs are two writes to one document, and the second should hear of the
 * first.
 */

/** The header name, in one place so a rename is one edit. */
export const PRECONDITION_HEADER = 'If-Match';

/** The error code the server answers a failed precondition with. */
export const STALE_WRITE_CODE = 'stale_write';

/**
 * The headers a write carries, given the version it was composed against.
 *
 * `undefined` when the caller has no version yet — a create, or a document
 * that has not been read. An absent `If-Match` is not a wildcard: the server
 * is specified to treat it as "no opinion", which is correct for a create and
 * wrong for an update, so callers that hold a version must pass it.
 */
export function preconditionHeaders(
  version: number | undefined,
): Record<string, string> {
  return version === undefined
    ? {}
    : { [PRECONDITION_HEADER]: String(version) };
}

/** What a `409 stale_write` carries back. */
export interface StaleWrite {
  /** The document as the server now holds it, when the response carries it. */
  readonly current: unknown;
  /** Its draft revision, which a retry would have to match. */
  readonly currentVersion: number | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads a stale-write response. `api` sends `{ draftRevision }` and no
 * document.
 */
export function readStaleWrite(payload: unknown): StaleWrite {
  if (!isRecord(payload)) return { current: null, currentVersion: undefined };

  const current = payload.current ?? payload.portfolio ?? payload.document ?? null;
  const version = isRecord(current)
    ? current.draftRevision
    : payload.draftRevision;

  return {
    current,
    currentVersion: typeof version === 'number' ? version : undefined,
  };
}
