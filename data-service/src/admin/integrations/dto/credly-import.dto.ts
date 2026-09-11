import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CredlyImportDto {
  @ApiProperty({
    type: String,
    required: true,
    description: 'Public Credly profile username.',
    example: 'alice-doe',
  })
  @IsString()
  username: string;
}
