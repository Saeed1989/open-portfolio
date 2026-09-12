import { ApiProperty } from '@nestjs/swagger';
import { SECTION_TYPES, type SectionType } from '@portfolio/registry';
import {
  LINK_STATES,
  type LinkState,
} from '../../../schemas/link-health.schema';

export class LinkHealthDto {
  @ApiProperty({
    enum: [...SECTION_TYPES],
    required: true,
    example: 'projects',
  })
  sectionType: SectionType;

  @ApiProperty({
    type: String,
    required: true,
    example: '66e1f0c2a1b2c3d4e5f60718',
  })
  itemId: string;

  @ApiProperty({
    type: String,
    required: true,
    example: 'https://demo.alice.dev',
  })
  url: string;

  @ApiProperty({ enum: [...LINK_STATES], required: true, example: 'ok' })
  state: LinkState;

  @ApiProperty({ type: Number, required: false, example: 200 })
  statusCode?: number;

  @ApiProperty({
    type: Date,
    required: false,
    example: '2026-09-01T03:00:00.000Z',
  })
  lastCheckedAt?: Date;

  @ApiProperty({ type: Number, required: true, example: 0 })
  consecutiveFailures: number;
}
