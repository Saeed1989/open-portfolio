import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class ConnectIntegrationDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    required: true,
    description: 'Per provider: `{ username }`, `{ feedUrl }`, ... (§5.4).',
    example: { feedUrl: 'https://alice.dev/rss.xml' },
  })
  @IsObject()
  config: Record<string, unknown>;
}
