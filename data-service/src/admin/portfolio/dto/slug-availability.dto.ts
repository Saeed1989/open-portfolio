import { ApiProperty } from '@nestjs/swagger';
import type { SlugStatus } from '../slug';

const SLUG_STATUSES: readonly SlugStatus[] = [
  'invalid',
  'reserved',
  'taken',
  'available',
];

/** Advisory only: the write decides (§7.2). */
export class SlugAvailabilityDto {
  @ApiProperty({
    type: String,
    required: true,
    example: 'eve-dev',
    description: 'The slug as normalised.',
  })
  slug: string;

  @ApiProperty({ enum: SLUG_STATUSES, required: true, example: 'available' })
  status: SlugStatus;
}
