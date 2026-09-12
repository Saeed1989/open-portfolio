import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CredlyBadgeDto {
  @ApiProperty({
    type: String,
    required: true,
    description:
      'Pasted Credly embed code. Only the badge identifier is kept; the markup is never stored (FR-INT-14).',
    example:
      '<div data-share-badge-id="8f0e4a2c-1b3d-4e5f-9a6b-7c8d9e0f1a2b"></div>',
  })
  @IsString()
  embedCode: string;
}
