import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Portfolio } from '../../schemas/portfolio.schema';
import {
  PublicAnalyticsDto,
  PublicConfigDto,
  PublicSectionRefDto,
  PublicSeoDto,
  PublicThemeDto,
  RenderPayloadDto,
} from './dto/render-payload.dto';

/** What the projection below brings back, and the only shape mapped from. */
interface StoredPublishedTree {
  config?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/*
 * The allowlist (FR-API-1).
 *
 * Every field below reaches the response because it is named here. Nothing is
 * spread from the stored document and nothing is stripped from it, so a field
 * added to the stored tree — by a future builder, or by a hand-edited document
 * — cannot reach a visitor by default. That is the whole point of the rule:
 * the failure mode of an allowlist is a missing field, not a leaked one.
 *
 * `config` is allowlisted field by field because each of its values is
 * public-safe for a stated reason (§2.1). `data` is not: §7.1 makes it content
 * only, bounded by what the registry declares, since draft writes are
 * validated against the descriptors (FR-API-4) and the builder adds nothing.
 * Re-deriving it here would mean restating the registry inside this service,
 * which FR-REG-1 forbids.
 */

function toTheme(value: unknown): PublicThemeDto {
  const theme = isRecord(value) ? value : {};
  return {
    accent: theme.accent as string | undefined,
    accentInk: theme.accentInk as string | undefined,
    accentOn: theme.accentOn as string | undefined,
    mode: theme.mode as PublicThemeDto['mode'],
    fontPairing: theme.fontPairing as string | undefined,
  };
}

function toSeo(value: unknown): PublicSeoDto {
  const seo = isRecord(value) ? value : {};
  return {
    title: seo.title as string | undefined,
    description: seo.description as string | undefined,
    keywords: seo.keywords as string[] | undefined,
    ogImageUrl: seo.ogImageUrl as string | undefined,
  };
}

/** Absent, not null, when the tenant has configured none (FR-ANL-3). */
function toAnalytics(value: unknown): PublicAnalyticsDto | undefined {
  if (!isRecord(value)) return undefined;
  return {
    provider: value.provider as PublicAnalyticsDto['provider'],
    id: value.id as string,
  };
}

function toSections(value: unknown): PublicSectionRefDto[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((section) => ({
    type: section.type as PublicSectionRefDto['type'],
    order: section.order as number,
  }));
}

function toRenderPayload(published: StoredPublishedTree): RenderPayloadDto {
  const config = isRecord(published.config) ? published.config : {};
  const analytics = toAnalytics(config.analytics);

  const publicConfig: PublicConfigDto = {
    theme: toTheme(config.theme),
    seo: toSeo(config.seo),
    sections: toSections(config.sections),
  };
  if (analytics) publicConfig.analytics = analytics;

  return {
    config: publicConfig,
    data: isRecord(published.data) ? published.data : {},
  };
}

@Injectable()
export class PortfoliosService {
  constructor(
    @InjectModel(Portfolio.name) private readonly portfolios: Model<Portfolio>,
  ) {}

  /**
   * One find on `portfolios`, projecting `published.config` and
   * `published.data`, and no outbound HTTP (§2.2, NFR-PERF-3).
   *
   * The filter carries all three of FR-TEN-3's cases, so they take the same
   * branch and produce one indistinguishable 404: an unknown slug matches
   * nothing, an unpublished one has no `published` tree, and a suspended one
   * is excluded by status. Deciding them separately would be the natural way
   * to write this and would leak which it was through timing or message.
   *
   * `published.source` is excluded by the projection, never by deletion after
   * the read (§5.2). It is not sent to the mapper at all.
   *
   * A retired slug's 301 (FR-DAT-2, AP-2) is **not** handled here — see the
   * note in the README. This find matches the current slug only.
   */
  async getRenderPayload(slug: string): Promise<RenderPayloadDto> {
    const document = await this.portfolios
      .findOne(
        {
          slug,
          status: { $ne: 'suspended' },
          published: { $ne: null },
        },
        { 'published.config': 1, 'published.data': 1 },
      )
      .lean<{ published?: StoredPublishedTree } | null>()
      .exec();

    if (!document?.published) throw new NotFoundException();

    return toRenderPayload(document.published);
  }
}
