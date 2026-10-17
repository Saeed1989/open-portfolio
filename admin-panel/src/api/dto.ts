/*
 * The admin surface's wire types, hand-written from
 * `data-service/openapi/admin.json`. They are admin's own view of the wire:
 * no DTO is shared with `api`. Section content is `unknown` on purpose — its
 * shape is the registry's to declare.
 */

export type AuthProvider = 'github' | 'google';
export type PortfolioStatus = 'unpublished' | 'published' | 'suspended';
export type ThemeMode = 'light' | 'dark' | 'system';
export type AnalyticsProvider = 'plausible' | 'ga';
export type IntegrationProvider = 'github' | 'rss' | 'x' | 'linkedin';
export type IntegrationStatus = 'ok' | 'failing' | 'revoked';
export type LinkState = 'ok' | 'broken' | 'unchecked';

/**
 * A section type, as it travels on the wire. Deliberately `string`, not a
 * union: a union would make every new section type an edit to this file.
 */
export type SectionType = string;

/** What `admin` branches on to choose dashboard or creation screen. */
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
  /** The draft's concurrency token; a draft write echoes it in `If-Match`. */
  readonly draftRevision: number;
  /** The `draftRevision` last published; null before the first publish. */
  readonly publishedDraftRevision: number | null;
}

/** What `PATCH /admin/portfolio/sections/:type` answers. */
export interface UpdatedSection {
  readonly draftRevision: number;
  readonly section: AdminSection;
}

/**
 * `GET /admin/slug-availability`. The answer is advisory: only the write
 * decides.
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
  readonly publishedDraftRevision: number;
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
