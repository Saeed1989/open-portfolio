/**
 * One-time import of a public Credly wallet, run only on tenant action: no
 * schedule, no cache, no connection. Kept apart from parse.ts so the portfolio
 * build carries no HTTP client.
 *
 * The upstream endpoint is undocumented and may change, so every field is read
 * defensively and an unrecognised response is a handled error, never a throw.
 */

import type { AchievementItem } from '../content';
import type { FieldError } from '../types';
import { CREDLY_ORIGIN } from './parse';

const DEFAULT_TIMEOUT_MS = 10000;

/** Injectable so the api can supply a guarded fetch. */
export type FetchLike = typeof fetch;

export interface CredlyImportOptions {
  readonly fetchImpl?: FetchLike;
  readonly timeoutMs?: number;
}

export interface CredlyImportSuccess {
  readonly ok: true;
  /** New items, to append to the draft only. The tenant reviews before publishing. */
  readonly items: readonly AchievementItem[];
  /** Badges already present, left untouched along with any edits to them. */
  readonly duplicates: number;
  /** Entries the upstream response could not be read into an item. */
  readonly unusable: number;
}

export interface CredlyImportFailure {
  readonly ok: false;
  readonly error: FieldError;
}

export type CredlyImportOutcome = CredlyImportSuccess | CredlyImportFailure;

type Dict = Record<string, unknown>;

function isRecord(value: unknown): value is Dict {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function fail(path: string, message: string): CredlyImportFailure {
  return { ok: false, error: { path, message } };
}

const UNAVAILABLE =
  'Could not import from Credly just now. The badge list is unavailable or in a form we do not recognise — try again later, or add a badge by pasting its embed code.';

/**
 * The wallet URL. SSRF guard: the origin is constant and the username is one
 * percent-encoded path segment, so no input can move the request to another
 * host; `redirect: 'error'` on the fetch stops a redirect doing so.
 */
export function credlyBadgesUrl(username: string): string {
  const path = `/users/${encodeURIComponent(username)}/badges`;
  return `${CREDLY_ORIGIN}${path}?sort=-state_updated_at&page=1`;
}

/** An ISO timestamp becomes its year; anything unrecognisable becomes nothing. */
function yearOf(value: unknown): string | undefined {
  const raw = text(value);
  if (raw === undefined) return undefined;
  const year = raw.slice(0, 4);
  return /^[0-9]{4}$/.test(year) ? year : undefined;
}

/** Credly nests the issuer a few different ways. Try each, give up quietly. */
function issuerOf(template: Dict): string | undefined {
  const issuer = template.issuer;
  if (!isRecord(issuer)) return undefined;

  const entities = issuer.entities;
  if (Array.isArray(entities)) {
    for (const entry of entities) {
      if (isRecord(entry) && isRecord(entry.entity)) {
        const name = text(entry.entity.name);
        if (name !== undefined) return name;
      }
    }
  }

  return text(issuer.name);
}

function toItem(raw: unknown): AchievementItem | null {
  if (!isRecord(raw)) return null;

  const badgeId = text(raw.id)?.toLowerCase();
  if (badgeId === undefined) return null;

  const template = isRecord(raw.badge_template) ? raw.badge_template : {};

  /* Without a title there is nothing to show and nothing the empty rule would
     keep, so the entry is counted as unusable rather than imported blank. */
  const title = text(template.name) ?? text(raw.title);
  if (title === undefined) return null;

  return {
    id: `credly-${badgeId}`,
    type: 'certification',
    source: 'credly',
    title,
    issuer: issuerOf(template),
    date: yearOf(raw.issued_at),
    credlyBadgeId: badgeId,
    verifyUrl: text(raw.public_url),
  };
}

/** The badge array, wherever this version of the endpoint keeps it. */
function badgeArray(payload: unknown): unknown[] | null {
  if (!isRecord(payload)) return null;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.badges)) return payload.badges;
  return null;
}

/**
 * Reads the wallet and returns the items to append to the draft. A badge
 * already in `existing` is counted and skipped, so a re-run never overwrites
 * the tenant's edits. Only the first page is read.
 */
export async function importCredlyBadges(
  username: unknown,
  existing: readonly AchievementItem[] = [],
  options: CredlyImportOptions = {},
): Promise<CredlyImportOutcome> {
  const name = typeof username === 'string' ? username.trim() : '';
  if (name.length === 0) {
    return fail(
      'credlyUsername',
      'Enter the username from your Credly profile address.',
    );
  }

  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  let payload: unknown;
  try {
    const response = await doFetch(credlyBadgesUrl(name), {
      headers: { accept: 'application/json' },
      redirect: 'error',
      signal: controller.signal,
    });

    if (!response.ok) {
      return response.status === 404
        ? fail(
            'credlyUsername',
            'No public Credly profile found for that username.',
          )
        : fail('credlyUsername', UNAVAILABLE);
    }

    payload = await response.json();
  } catch {
    /* Timeout, abort, network failure, malformed JSON — all the same to the
       tenant, and none of them a 500. */
    return fail('credlyUsername', UNAVAILABLE);
  } finally {
    clearTimeout(timer);
  }

  const badges = badgeArray(payload);
  if (badges === null) return fail('credlyUsername', UNAVAILABLE);

  const seen = new Set<string>(
    existing
      .map((item) => item.credlyBadgeId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .map((id) => id.toLowerCase()),
  );

  const items: AchievementItem[] = [];
  let duplicates = 0;
  let unusable = 0;

  for (const badge of badges) {
    const item = toItem(badge);
    if (item === null) {
      unusable++;
      continue;
    }

    const badgeId = item.credlyBadgeId as string;
    if (seen.has(badgeId)) {
      duplicates++;
      continue;
    }

    seen.add(badgeId);
    items.push(item);
  }

  return { ok: true, items, duplicates, unusable };
}
