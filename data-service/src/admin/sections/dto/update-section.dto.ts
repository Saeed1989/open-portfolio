import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsObject, IsOptional } from 'class-validator';

/** Toggle, reorder, or replace content — any combination (FR-CFG-1, FR-CFG-3). */
export class UpdateSectionDto {
  @ApiProperty({ type: Boolean, required: false, example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ type: Number, required: false, example: 2 })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    required: false,
    description:
      "Replacement content, shaped by the registry's descriptor for :type.",
    example: { items: [] },
  })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}
