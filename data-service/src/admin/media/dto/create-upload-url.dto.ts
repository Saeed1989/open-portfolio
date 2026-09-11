import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class CreateUploadUrlDto {
  @ApiProperty({ type: String, required: true, example: 'image/png' })
  @IsString()
  mimeType: string;

  @ApiProperty({ type: Number, required: true, example: 482133 })
  @IsInt()
  bytes: number;

  @ApiProperty({
    type: String,
    required: true,
    description: 'Required at upload time (FR-MED-5).',
    example: 'Screenshot of the dashboard',
  })
  @IsString()
  altText: string;
}
