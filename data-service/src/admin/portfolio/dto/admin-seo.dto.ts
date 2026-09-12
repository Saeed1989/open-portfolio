import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

/**
 * The draft's SEO fields (FR-PUB-1, FR-PUB-3), and the body of
 * PATCH /admin/portfolio/seo.
 */
export class AdminSeoDto {
  @ApiProperty({
    type: String,
    required: false,
    example: 'Alice Doe — Full-stack engineer',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    type: String,
    required: false,
    example: 'I build fast, accessible web products.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    type: [String],
    required: false,
    example: ['full-stack engineer', 'performance'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiProperty({
    type: String,
    required: false,
    description: 'Media asset id of an uploaded OG image.',
    example: '66e1f0c2a1b2c3d4e5f60718',
  })
  @IsOptional()
  @IsString()
  ogImageAssetId?: string;
}
