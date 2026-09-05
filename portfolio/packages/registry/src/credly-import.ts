/**
 * One-time import of a public Credly wallet.
 *
 * This is the FR-INT-10 pattern, not the FR-INT-2 one: it runs when the tenant
 * presses a button and never otherwise. There is no schedule, no worker, no
 * `integrationCache` row and no `integrationConnections` row, because there is
 * nothing to keep in sync — the badges become ordinary achievement items the
 * moment they land, and the tenant owns them from then on. A page render never
 * reaches this module (FR-INT-1, NFR-PERF-3).
 *
 * Kept apart from credly.ts on purpose. That module is imported by the section
 * descriptors and therefore travels into the portfolio build; this one is
 * imported by nothing but the api, so the render path never carries an HTTP
 * client it has no use for.
 *
 * **The upstream endpoint is undocumented.** It is not part of any published
 * Credly API and can change shape or disappear without notice. Every field is
 * therefore read defensively and an unrecognised response produces a handled
 * error, never a throw — a broken third party must cost the tenant an error
 * message, not a 500.
 */

import type { AchievementItem } from './content';
import type { FieldError } from './types';
import { CREDLY_ORIGIN } from './credly';

const DEFAULT_TIMEOUT_MS = 10000;

/** Injectable so the api can supply a guarded fetch (NFR-SEC-5). */
export type FetchLike = typeof fetch;

export interface CredlyImportOptions {
  readonly fetchImpl?: FetchLike;
  readonly timeoutMs?: number;
}

export interface CredlyImportSuccess {
  readonly ok: true;
  /**
   * New items, to be appended to the **draft** collection.
   *
   * Never to `published`. The tenant reviews and publishes: business req 11.3
   * asks for high-signal badges only, and a wallet is rarely all high-signal,
   * so most of this is expected to be deleted before it goes live.
   */
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
 * The wallet URL.
 *
 * The origin is a constant and the only tenant-supplied part is one path
 * segment, percent-encoded on the way in — encoding, not a rule about what the
 * username may contain, so a name with a slash or a `..` in it is escaped into
 * a single harmless segment rather than reshaping the path. No input can move
 * this request to another host, which is the SSRF requirement in NFR-SEC-5 met
 * where the URL is built. `redirect: 'error'` on the call below closes the
 * other half: a redirect cannot walk us onto a private address.
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
 * Reads the wallet and returns the items to append to the draft.
 *
 * `existing` is the current draft collection. Anything whose badge id is
 * already there is counted and skipped, so a second run adds only what is new
 * and never writes over a title the tenant has rewritten.
 *
 * Only the first page is read. A wallet longer than that is a review problem
 * rather than an import problem — business req 11.3 wants a handful of
 * high-signal badges, not the whole collection.
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
