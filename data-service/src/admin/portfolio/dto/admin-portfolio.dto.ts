import { ApiProperty } from '@nestjs/swagger';
import {
  ANALYTICS_PROVIDERS,
  PORTFOLIO_STATUSES,
  type AnalyticsProvider,
  type PortfolioStatus,
} from '../../../schemas/portfolio.schema';
import { AdminSectionDto } from '../../sections/dto/admin-section.dto';
import { AdminSeoDto } from './admin-seo.dto';
import { AdminThemeDto } from './admin-theme.dto';

export class AdminAnalyticsDto {
  @ApiProperty({
    enum: [...ANALYTICS_PROVIDERS],
    required: true,
    example: 'plausible',
  })
  provider: AnalyticsProvider;

  @ApiProperty({ type: String, required: true, example: 'alice.site.com' })
  id: string;
}

export class DraftDto {
  @ApiProperty({ type: [AdminSectionDto], required: true })
  sections: AdminSectionDto[];

  @ApiProperty({ type: AdminThemeDto, required: true })
  theme: AdminThemeDto;

  @ApiProperty({ type: AdminSeoDto, required: true })
  seo: AdminSeoDto;

  @ApiProperty({
    type: AdminAnalyticsDto,
    required: true,
    nullable: true,
    description: 'Null until the tenant configures one.',
  })
  analytics: AdminAnalyticsDto | null;
}

/** The session's portfolio with its full draft. Never the published tree. */
export class AdminPortfolioDto {
  @ApiProperty({ type: String, required: true, example: 'alice' })
  slug: string;

  @ApiProperty({
    enum: [...PORTFOLIO_STATUSES],
    required: true,
    example: 'unpublished',
  })
  status: PortfolioStatus;

  @ApiProperty({ type: Number, required: true, example: 2 })
  registryVersion: number;

  @ApiProperty({ type: String, required: false, example: 'developer' })
  presetId?: string;

  @ApiProperty({ type: DraftDto, required: true })
  draft: DraftDto;

  @ApiProperty({
    type: Date,
    required: false,
    nullable: true,
    example: '2026-09-01T10:00:00.000Z',
  })
  publishedAt?: Date | null;

  @ApiProperty({ type: Number, required: true, example: 3 })
  version: number;
}
