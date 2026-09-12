import { ApiProperty } from '@nestjs/swagger';
import { SECTION_TYPES, type SectionType } from '@portfolio/registry';
import {
  ANALYTICS_PROVIDERS,
  type AnalyticsProvider,
} from '../../../schemas/portfolio.schema';

/*
 * The public render payload (SRS §7.1). Each class is an allowlist: a field
 * reaches the response because it is named here (FR-API-1). Nothing below is
 * shared with, or derived from, an admin DTO.
 */

export class PublicThemeDto {
  @ApiProperty({ type: String, required: false, example: '#2f5bff' })
  accent?: string;

  @ApiProperty({ type: String, required: false, example: '#1b3ac2' })
  accentInk?: string;

  @ApiProperty({ type: String, required: false, example: '#ffffff' })
  accentOn?: string;

  @ApiProperty({
    enum: ['light', 'dark', 'system'],
    required: false,
    example: 'system',
  })
  mode?: 'light' | 'dark' | 'system';

  @ApiProperty({ type: String, required: false, example: 'grotesk-spline' })
  fontPairing?: string;
}

export class PublicSeoDto {
  @ApiProperty({
    type: String,
    required: false,
    example: 'Mira Okonkwo — Full-stack engineer',
  })
  title?: string;

  @ApiProperty({
    type: String,
    required: false,
    example: 'I build fast, accessible web products.',
  })
  description?: string;

  @ApiProperty({
    type: [String],
    required: false,
    example: ['full-stack engineer', 'performance'],
  })
  keywords?: string[];

  @ApiProperty({
    type: String,
    required: false,
    example: 'https://cdn.site.com/og/alice.png',
  })
  ogImageUrl?: string;
}

export class PublicAnalyticsDto {
  @ApiProperty({
    enum: [...ANALYTICS_PROVIDERS],
    required: true,
    example: 'plausible',
  })
  provider: AnalyticsProvider;

  @ApiProperty({ type: String, required: true, example: 'alice.site.com' })
  id: string;
}

export class PublicSectionRefDto {
  @ApiProperty({
    enum: [...SECTION_TYPES],
    required: true,
    example: 'projects',
  })
  type: SectionType;

  @ApiProperty({ type: Number, required: true, example: 1 })
  order: number;
}

export class PublicConfigDto {
  @ApiProperty({ type: PublicThemeDto, required: true })
  theme: PublicThemeDto;

  @ApiProperty({ type: PublicSeoDto, required: true })
  seo: PublicSeoDto;

  @ApiProperty({
    type: PublicAnalyticsDto,
    required: false,
    description: 'Absent when the tenant has configured none (FR-ANL-3).',
  })
  analytics?: PublicAnalyticsDto;

  @ApiProperty({
    type: [PublicSectionRefDto],
    required: true,
    description: 'Enabled, non-empty sections only, in ascending order.',
  })
  sections: PublicSectionRefDto[];
}

export class RenderPayloadDto {
  @ApiProperty({ type: PublicConfigDto, required: true })
  config: PublicConfigDto;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    required: true,
    description:
      'Section content keyed by type — one key per entry in config.sections, and no other. Each value is shaped by the registry.',
    example: { hero: {}, projects: [] },
  })
  data: Record<string, unknown>;
}
