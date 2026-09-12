import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const THEME_MODES = ['light', 'dark', 'system'] as const;

/**
 * The tenant-supplied theme (FR-THM-1): the draft's theme, and the body of
 * PATCH /admin/portfolio/theme.
 */
export class AdminThemeDto {
  @ApiProperty({ type: String, required: false, example: '#2f5bff' })
  @IsOptional()
  @IsString()
  accent?: string;

  @ApiProperty({ enum: [...THEME_MODES], required: false, example: 'system' })
  @IsOptional()
  @IsIn(THEME_MODES)
  mode?: (typeof THEME_MODES)[number];

  @ApiProperty({ type: String, required: false, example: 'grotesk-spline' })
  @IsOptional()
  @IsString()
  fontPairing?: string;
}
