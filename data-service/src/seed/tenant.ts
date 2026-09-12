import {
  isSectionEmpty,
  REGISTRY,
  type SectionType,
  type TypedSectionInstance,
} from '@portfolio/registry';
import type {
  AnalyticsProvider,
  PortfolioStatus,
} from '../schemas/portfolio.schema';
import type { AuthProvider, UserStatus } from '../schemas/user.schema';
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

export interface SeedTenant {
  readonly name: TenantName;
  readonly user: {
    readonly provider: AuthProvider;
    readonly providerId: string;
    readonly email: string;
    readonly displayName: string;
    readonly avatarUrl: string;
    readonly status: UserStatus;
  };
  readonly slug: string;
  readonly status: PortfolioStatus;
  readonly presetId: string;
  readonly version: number;
  readonly draft: SeedDraft;
  /** False leaves `published` null, so the slug 404s publicly (§2.4). */
  readonly publish: boolean;
  readonly media: readonly SeedMedia[];
}

export interface PublishedTreeShape {
  readonly config: Record<string, unknown>;
  readonly data: Record<string, unknown>;
  readonly source: Record<string, unknown>;
}

/*
 * Builds the two served halves and `source` from a draft (SRS §2.3 step 7).
 *
 * **This is a stand-in.** FR-REG-9 puts this in the registry package — "It is
 * the only code that produces the shape" — and `@portfolio/registry` does not
 * export it yet. The seed needs published tenants, so it assembles the tree
 * here rather than blocking on the builder.
 *
 * TODO(FR-REG-9): delete this and call the registry's builder once it exists.
 * Seeded published trees must then be regenerated, because a discrepancy
 * between what the seed writes and what a publish writes is exactly the defect
 * the fixture is supposed to catch.
 *
 * It is deliberately generic over descriptors and hard-codes no field list
 * (FR-REG-1): it drops disabled sections, drops those whose content satisfies
 * their descriptor's `emptyCondition`, orders by `order`, and keys `data` by
 * type. It does not merge integration payloads — no seeded tenant has a
 * connection — and it does not strip per-item `published: false`, because no
 * seeded tenant has an achievements item.
 */
export function buildPublishedTree(draft: SeedDraft): PublishedTreeShape {
  const enabled = [...draft.sections]
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order);

  const survivors = enabled.filter(
    (section) => !isSectionEmpty(section.type, section.content),
  );

  const data: Record<string, unknown> = {};
  for (const section of survivors) {
    /*
     * §7.1: a collection type emits its items as a bare array, a single type
     * emits its content object. A collection's section-level fields —
     * `skills.categories`, `skills.legend`, `projects.categories` — have
     * nowhere to go in that shape and are dropped here. See the conflict note
     * in docs/data-design.md.
     */
    const descriptor = REGISTRY[section.type as SectionType];
    data[section.type] =
      descriptor.cardinality === 'collection'
        ? ((section.content as { items?: unknown[] }).items ?? [])
        : section.content;
  }

  return {
    config: {
      theme: draft.theme,
      seo: draft.seo,
      ...(draft.analytics ? { analytics: draft.analytics } : {}),
      sections: survivors.map((section) => ({
        type: section.type,
        order: section.order,
      })),
    },
    data,
    source: {
      sections: enabled,
      theme: draft.theme,
      seo: draft.seo,
      analytics: draft.analytics,
    },
  };
}
