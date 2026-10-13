import type { TypedSectionInstance } from '@portfolio/registry';
import type {
  AnalyticsProvider,
  PortfolioStatus,
} from '../schemas/portfolio.schema';
import type { AuthProvider } from '../auth/account-access';
import type { UserStatus } from '../auth/schemas/user.schema';
import type { TenantName } from './ids';

export interface SeedDraft {
  readonly sections: readonly TypedSectionInstance[];
  readonly theme: Record<string, unknown>;
  readonly seo: Record<string, unknown>;
  readonly analytics: { provider: AnalyticsProvider; id: string } | null;
}

export interface SeedMedia {
  readonly sequence: number;
  readonly storageKey: string;
  readonly url: string;
  readonly mimeType: string;
  readonly bytes: number;
  readonly width: number;
  readonly height: number;
  readonly altText: string;
}

export interface SeedUser {
  readonly provider: AuthProvider;
  readonly providerId: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string;
  readonly status: UserStatus;
}

/** A signed-in user who has not created a portfolio yet (FR-AUTH-2). */
export interface SeedAccount {
  readonly name: TenantName;
  readonly user: SeedUser;
}

export interface SeedTenant {
  readonly name: TenantName;
  readonly user: SeedUser;
  readonly slug: string;
  readonly status: PortfolioStatus;
  readonly presetId: string;
  readonly version: number;
  readonly draft: SeedDraft;
  /** False leaves `published` null, so the slug 404s publicly (§2.4). */
  readonly publish: boolean;
  readonly media: readonly SeedMedia[];
}
