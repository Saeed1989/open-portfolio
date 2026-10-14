import {
  isRecord,
  isSectionEmpty,
  type SectionType,
} from '@portfolio/registry';

/** A content tree in draft shape. */
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

/* An item carrying `published: false` stays in the draft only. */
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
 * Builds the two served halves and `source` from a draft. Called by publish
 * and by the seed, so both store the same shape.
 *
 * A stand-in: the builder belongs in `@portfolio/registry`, which does not
 * export one yet. Generic over descriptors, with no hard-coded field list.
 * Merges no integration payload: no sync writes one yet.
 *
 * TODO: replace with the registry's builder once it exists.
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
     * `data[type]` is the section's content object verbatim: a collection's
     * items stay under `items`, alongside its section-level fields, which a
     * bare array would discard.
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
