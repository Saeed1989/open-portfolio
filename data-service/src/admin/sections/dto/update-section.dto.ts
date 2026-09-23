import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional } from 'class-validator';

/*
 * Toggle, replace content, or both (FR-CFG-1). At least one is required.
 * `order` is not accepted: reordering is not implemented, so the global pipe
 * rejects it as an unknown key.
 */
export class UpdateSectionDto {
  @ApiProperty({ type: Boolean, required: false, example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    required: false,
    description:
      "Replacement content, shaped by the registry's descriptor for :type. Replaces the stored content in full.",
    example: { items: [] },
  })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}
