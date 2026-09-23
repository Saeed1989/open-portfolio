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

/** The draft revision is also sent as the `ETag` header. */
export class AdminSectionsDto {
  @ApiProperty({ type: Number, required: true, example: 3 })
  draftRevision: number;

  @ApiProperty({ type: [AdminSectionDto], required: true })
  sections: AdminSectionDto[];
}

/** One section after a write, with the revision the next write must match. */
export class UpdatedSectionDto {
  @ApiProperty({ type: Number, required: true, example: 4 })
  draftRevision: number;

  @ApiProperty({ type: AdminSectionDto, required: true })
  section: AdminSectionDto;
}
