import { ApiProperty } from '@nestjs/swagger';

export class PublishResultDto {
  @ApiProperty({ type: Number, required: true, example: 4 })
  version: number;

  @ApiProperty({
    type: Date,
    required: true,
    example: '2026-09-01T10:00:00.000Z',
  })
  publishedAt: Date;
}
