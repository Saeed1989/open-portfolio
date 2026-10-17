/*
 * The admin surface's error model, as one closed set: every failure arrives
 * as an `AdminError` with a discriminant, so a caller matches on a name
 * rather than a status code.
 *
 * `api`'s global filter is still Nest's default, so a validation failure
 * arrives as `{ statusCode, message, error }`. The parser reads the intended
 * envelope first and falls back to that shape.
 */

import { STALE_WRITE_CODE } from './precondition';

export type AdminErrorKind =
  /** No session, or one that failed to resolve. `gateway` answers this
   *  before the admin surface is reached. */
  | 'unauthorized'
  /** The tenant already has a portfolio. Takes precedence over every slug
   *  error. */
  | 'portfolio_exists'
  /** The write's `If-Match` no longer matches the document's version.
   *  Carries the current document in `payload`. */
  | 'stale_write'
  /** The slug belongs to another portfolio, is in another's slugHistory, or
   *  is in a deletion hold. A field-level error on `slug`. */
  | 'slug_taken'
  /** No portfolio for this tenant; every route but three answers it. */
  | 'portfolio_not_found'
  /** Field-level validation failure — every failure at once, never only
   *  the first. */
  | 'validation'
  /** Too many requests; the slug check allows 30 a minute per tenant. */
  | 'rate_limited'
  /** The API reached, and failed. */
  | 'server'
  /**
   * The endpoint exists in the contract but this build does not implement it
   * — `501`, or `405` for a method the route does not accept.
   *
   * Distinct from `server` because it is permanent: retrying cannot make an
   * unimplemented endpoint appear, and a client that retries anyway spends
   * the rest of the session asking.
   */
  | 'unsupported'
  /** The API not reached at all: offline, DNS, abort. */
  | 'network';

/** One field's failure. `path` is the draft path, e.g. `projects.1.impact`. */
export interface FieldError {
  readonly path: string;
  readonly message: string;
  readonly code?: string;
}

export class AdminError extends Error {
  readonly kind: AdminErrorKind;
  readonly status: number;
  /** The API's own code when it sent one, e.g. `slug_reserved`. */
  readonly code: string | undefined;
  readonly fields: readonly FieldError[];
  /** The error envelope's own body, for the codes that carry one — today
   *  only `stale_write`, which returns the current document. */
  readonly payload: unknown;

  constructor(init: {
    kind: AdminErrorKind;
    status: number;
    message: string;
    code?: string | undefined;
    fields?: readonly FieldError[] | undefined;
    payload?: unknown;
  }) {
    super(init.message);
    this.name = 'AdminError';
    this.kind = init.kind;
    this.status = init.status;
    this.code = init.code;
    this.fields = init.fields ?? [];
    this.payload = init.payload ?? null;
  }

  /** The failures for one field, for rendering beneath its control. */
  fieldErrors(path: string): readonly FieldError[] {
    return this.fields.filter((field) => field.path === path);
  }
}

/** The intended error envelope. */
interface SpecifiedEnvelope {
  readonly error?: {
    readonly code?: unknown;
    readonly message?: unknown;
    readonly fields?: unknown;
  };
}

/** What Nest sends by default. */
interface NestEnvelope {
  readonly statusCode?: unknown;
  readonly message?: unknown;
  readonly error?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readFields(value: unknown): readonly FieldError[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): FieldError[] => {
    if (!isRecord(entry)) return [];
    const path = entry['path'] ?? entry['field'];
    const message = entry['message'];
    if (typeof path !== 'string' || typeof message !== 'string') return [];
    const code = entry['code'];
    return [
      { path, message, ...(typeof code === 'string' ? { code } : {}) },
    ];
  });
}

function kindFor(status: number, code: string | undefined): AdminErrorKind {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 404) return 'portfolio_not_found';
  if (status === 409) {
    if (code === STALE_WRITE_CODE) return 'stale_write';
    return code === 'slug_taken' ? 'slug_taken' : 'portfolio_exists';
  }
  /* 400 as well as 422: Nest's ValidationPipe answers 400 by default, and
     both mean the same thing to a form. */
  if (status === 422 || status === 400) return 'validation';
  if (status === 429) return 'rate_limited';
  /* 501 is what a NestJS `NotImplementedException` answers, which is how
     every unbuilt admin write currently responds. */
  if (status === 501 || status === 405) return 'unsupported';
  return 'server';
}

/** Turns a failed response into an `AdminError`. Never throws. */
export async function parseError(response: Response): Promise<AdminError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    /* An empty or non-JSON body is normal: `/auth/resolve` answers 401 with
       no body at all, and `gateway` propagates it unchanged. */
  }

  const specified = isRecord(body)
    ? (body as SpecifiedEnvelope).error
    : undefined;

  if (isRecord(specified)) {
    const code =
      typeof specified['code'] === 'string' ? specified['code'] : undefined;
    const message =
      typeof specified['message'] === 'string'
        ? specified['message']
        : response.statusText;
    return new AdminError({
      kind: kindFor(response.status, code),
      status: response.status,
      message,
      code,
      fields: readFields(specified['fields']),
      payload: specified,
    });
  }

  /* What `api` sends today for its coded errors: an unwrapped
     `{ code, message, errors }` (sections.exceptions.ts,
     portfolio.exceptions.ts). Without this, a `409 slug_taken` would read
     as `portfolio_exists`. */
  if (isRecord(body) && typeof body['code'] === 'string') {
    const code = body['code'];
    return new AdminError({
      kind: kindFor(response.status, code),
      status: response.status,
      message:
        typeof body['message'] === 'string'
          ? body['message']
          : response.statusText,
      code,
      fields: readFields(body['errors']),
      payload: body,
    });
  }

  const nest = isRecord(body) ? (body as NestEnvelope) : {};
  const message = Array.isArray(nest.message)
    ? nest.message.filter((m): m is string => typeof m === 'string').join('; ')
    : typeof nest.message === 'string'
      ? nest.message
      : response.statusText || `HTTP ${String(response.status)}`;

  return new AdminError({
    kind: kindFor(response.status, undefined),
    status: response.status,
    message,
    /* Nest's flat `message` array carries no field paths, so a form gets one
       message rather than per-field errors. */
    fields: [],
  });
}
