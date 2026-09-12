import { ApiProperty } from '@nestjs/swagger';
import { SECTION_TYPES, type SectionType } from '@portfolio/registry';

/** One entry in the draft's section array (SRS §5.2). */
export class AdminSectionDto {
  @ApiProperty({
    enum: [...SECTION_TYPES],
    required: true,
    example: 'projects',
  })
  type: SectionType;

  @ApiProperty({ type: Boolean, required: true, example: true })
  enabled: boolean;

  @ApiProperty({ type: Number, required: true, example: 1 })
  order: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    required: true,
    description: "Shaped by the registry's descriptor for `type`.",
    example: { items: [] },
  })
  content: Record<string, unknown>;
}
