import { ApiProperty } from '@nestjs/swagger';

export class UploadUrlDto {
  @ApiProperty({
    type: String,
    required: true,
    example: '66e1f0c2a1b2c3d4e5f60718',
  })
  assetId: string;

  @ApiProperty({
    type: String,
    required: true,
    description: 'Short-lived; the browser uploads directly to it (FR-MED-1).',
    example: 'https://storage.site.com/uploads/abc?signature=xyz',
  })
  uploadUrl: string;

  @ApiProperty({
    type: Date,
    required: true,
    example: '2026-09-01T10:05:00.000Z',
  })
  expiresAt: Date;
}
