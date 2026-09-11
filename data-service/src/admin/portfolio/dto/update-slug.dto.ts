import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateSlugDto {
  @ApiProperty({ type: String, required: true, example: 'alice' })
  @IsString()
  slug: string;
}
