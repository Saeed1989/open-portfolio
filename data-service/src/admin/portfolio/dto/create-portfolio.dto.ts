import { ApiProperty } from '@nestjs/swagger';
import { PRESET_IDS, type PresetId } from '@portfolio/registry';
import { IsIn, IsOptional, IsString } from 'class-validator';

/**
 * The body of POST /admin/portfolio (§7.2, FR-AUTH-5). Format and reservation
 * of `slug` are checked by the service, so they answer with their own codes.
 */
export class CreatePortfolioDto {
  @ApiProperty({
    type: String,
    required: true,
    example: 'eve-dev',
    description: 'Trimmed and lower-cased before validation.',
  })
  @IsString()
  slug: string;

  @ApiProperty({
    type: String,
    required: false,
    example: 'Eve Martin',
    description: "Seeds the hero's name.",
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    enum: [...PRESET_IDS],
    required: false,
    default: 'software-engineer',
  })
  @IsOptional()
  @IsIn(PRESET_IDS)
  preset?: PresetId;
}
