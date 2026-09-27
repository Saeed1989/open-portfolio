/*
 * The admin surface's wire types, hand-written, in one file.
 *
 * Every type below is transcribed from `data-service/openapi/admin.json`,
 * which `api` regenerates on each dev boot from the DTOs of SRS §7.2. When
 * these are swapped for generated output, this file is the only one that
 * changes: nothing outside it re-declares a wire shape, and the transport in
 * `client.ts` is generic over them.
 *
 * These are admin's own view of the wire. They are deliberately not `api`'s
 * classes: §2.1 shares no DTO between surfaces, and admin may not import from
 * `api` at all.
 *
 * Section content is `unknown` on purpose. Its shape is the registry's to
 * declare (FR-REG-1), and a hand-written copy here would be a second source of
 * truth for the thing the registry exists to be the only source of.
 */

export type AuthProvider = 'github' | 'google';
export type PortfolioStatus = 'unpublished' | 'published' | 'suspended';
export type ThemeMode = 'light' | 'dark' | 'system';
export type AnalyticsProvider = 'plausible' | 'ga';
export type IntegrationProvider = 'github' | 'rss' | 'x' | 'linkedin';
export type IntegrationStatus = 'ok' | 'failing' | 'revoked';
export type LinkState = 'ok' | 'broken' | 'unchecked';

/**
 * A section type, as it travels on the wire.
 *
 * Deliberately `string` and not a union of the thirteen declared types. The
 * registry is the single source of truth for which types exist (FR-REG-1), and
 * FR-REG-3 requires that adding one costs a registry entry and no change to
 * `admin` — a union here would make every new section type an edit to this
 * file, which is the opposite of that.
 *
 * `api`'s OpenAPI document does enumerate them, because `api` validates
 * against the enum. This app does not validate section types: it asks the
 * registry for a descriptor and renders what comes back, or renders nothing.
 * The narrower type would buy checking that this app has no use for and cost
 * the property the registry exists to provide.
 */
export type SectionType = string;

/** What `admin` branches on to choose dashboard or creation screen (FR-AUTH-7). */
export interface MePortfolio {
  readonly slug: string;
  readonly status: PortfolioStatus;
}

export interface Me {
  readonly provider: AuthProvider;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
  /** Null when the tenant has no portfolio yet. */
  readonly portfolio: MePortfolio | null;
}

export interface AdminSection {
  readonly type: SectionType;
  readonly enabled: boolean;
  readonly order: number;
  readonly content: unknown;
}

export interface AdminTheme {
  readonly accent?: string;
  readonly mode?: ThemeMode;
  readonly fontPairing?: string;
}

export interface AdminSeo {
  readonly title?: string;
  readonly description?: string;
  readonly keywords?: readonly string[];
  readonly ogImageAssetId?: string;
}

export interface AdminAnalytics {
  readonly provider: AnalyticsProvider;
  readonly id: string;
}

export interface Draft {
  readonly sections: readonly AdminSection[];
  readonly theme: AdminTheme;
  readonly seo: AdminSeo;
  readonly analytics: AdminAnalytics | null;
}

export interface AdminPortfolio {
  readonly slug: string;
  readonly status: PortfolioStatus;
  readonly registryVersion: number;
  readonly presetId?: string;
  readonly draft: Draft;
  readonly publishedAt?: string | null;
  readonly version: number;
}

/**
 * `GET /admin/slug-availability` (§7.2).
 *
 * Specified but not yet implemented by `api` — it is absent from
 * openapi/admin.json. Declared here because the onboarding screen is the first
 * thing built on this transport and the answer is advisory in any case: only
 * the write decides.
 */
export type SlugAvailability = 'available' | 'taken' | 'reserved' | 'invalid';

export interface SlugAvailabilityResult {
  readonly slug: string;
  readonly status: SlugAvailability;
}

export interface UploadUrl {
  readonly assetId: string;
  readonly uploadUrl: string;
  readonly expiresAt: string;
}

export interface IntegrationCache {
  readonly payload: unknown;
  readonly fetchedAt: string;
  readonly stale: boolean;
}

export interface Integration {
  readonly provider: IntegrationProvider;
  readonly config: unknown;
  readonly status: IntegrationStatus;
  readonly lastSyncAt: string | null;
  readonly lastError: string | null;
  readonly consecutiveFailures: number;
  readonly cache: IntegrationCache | null;
}

export interface PublishResult {
  readonly version: number;
  readonly publishedAt: string;
}

export interface LinkHealth {
  readonly sectionType: SectionType;
  readonly itemId: string;
  readonly url: string;
  readonly state: LinkState;
  readonly statusCode?: number;
  readonly lastCheckedAt?: string;
  readonly consecutiveFailures: number;
}
