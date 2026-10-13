import {
  isRecord,
  isSectionEmpty,
  type SectionType,
} from '@portfolio/registry';

/** A content tree in draft shape (§5.2). */
export interface DraftTree {
  readonly sections: readonly {
    readonly type: SectionType;
    readonly enabled: boolean;
    readonly order: number;
    readonly content: unknown;
  }[];
  readonly theme: Record<string, unknown>;
  readonly seo: Record<string, unknown>;
  readonly analytics: { provider: string; id: string } | null;
}

export interface PublishedTreeShape {
  readonly config: Record<string, unknown>;
  readonly data: Record<string, unknown>;
  readonly source: Record<string, unknown>;
}

/* §5.2: an item carrying `published: false` stays in the draft only. */
function withoutUnpublishedItems(content: unknown): unknown {
  if (!isRecord(content) || !Array.isArray(content.items)) return content;
  return {
    ...content,
    items: content.items.filter(
      (item) => !(isRecord(item) && item.published === false),
    ),
  };
}

/*
 * Builds the two served halves and `source` from a draft (SRS §2.3 step 7).
 * Called by publish and by the seed, so a seeded tenant and a published one
 * hold the same shape.
 *
 * **This is a stand-in.** FR-REG-9 puts this in the registry package — "It is
 * the only code that produces the shape" — and `@portfolio/registry` does not
 * export it yet.
 *
 * TODO(FR-REG-9): delete this and call the registry's builder once it exists.
 *
 * It is deliberately generic over descriptors and hard-codes no field list
 * (FR-REG-1): it drops disabled sections and unpublished items, drops the
 * sections whose content satisfies their descriptor's `emptyCondition`, orders
 * by `order`, and keys `data` by type. It does not merge integration payloads:
 * no sync writes one yet.
 */
export function buildPublishedTree(draft: DraftTree): PublishedTreeShape {
  const enabled = [...draft.sections]
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order)
    .map((section) => ({
      ...section,
      content: withoutUnpublishedItems(section.content),
    }));

  const survivors = enabled.filter(
    (section) => !isSectionEmpty(section.type, section.content),
  );

  const data: Record<string, unknown> = {};
  for (const section of survivors) {
    /*
     * §7.1: `data[type]` is the section's content object verbatim, whatever
     * its cardinality — a collection's items stay under `items`, alongside
     * the section-level fields its descriptor declares (`skills.legend`,
     * `projects.categories`, `achievements.credlyUsername`). Projecting a
     * collection down to a bare array would discard those: `sectionFields`
     * has nowhere to go in one.
     */
    data[section.type] = section.content;
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
