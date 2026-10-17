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
 * The allowlist. Every `config` field reaches the response because it is
 * named here; nothing is spread from the stored document, so a field added to
 * the stored tree cannot reach a visitor by default. `data` passes through:
 * it is content only, bounded by what the registry declares.
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

/** Absent, not null, when the tenant has configured none. */
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
   * One find on `portfolios` and no outbound HTTP. The filter covers unknown,
   * unpublished and suspended slugs together, so all three produce one
   * indistinguishable 404 rather than leaking which it was.
   * `published.source` is excluded by the projection. A retired slug's
   * redirect is not handled here.
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
