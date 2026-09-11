import { ApiProperty } from '@nestjs/swagger';
import {
  CONNECTION_STATUSES,
  INTEGRATION_PROVIDERS,
  type ConnectionStatus,
  type IntegrationProvider,
} from '../../../schemas/integration-connection.schema';

/** The cached payload, returned as input to the admin preview (FR-CFG-5). */
export class IntegrationCacheDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    required: true,
    example: {},
  })
  payload: Record<string, unknown>;

  @ApiProperty({
    type: Date,
    required: true,
    example: '2026-09-01T06:00:00.000Z',
  })
  fetchedAt: Date;

  @ApiProperty({ type: Boolean, required: true, example: false })
  stale: boolean;
}

/** A connection's status and cache. Never its credentials (FR-INT-6). */
export class IntegrationDto {
  @ApiProperty({
    enum: [...INTEGRATION_PROVIDERS],
    required: true,
    example: 'github',
  })
  provider: IntegrationProvider;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    required: true,
    example: { username: 'alice' },
  })
  config: Record<string, unknown>;

  @ApiProperty({
    enum: [...CONNECTION_STATUSES],
    required: true,
    example: 'ok',
  })
  status: ConnectionStatus;

  @ApiProperty({
    type: Date,
    required: false,
    nullable: true,
    example: '2026-09-01T06:00:00.000Z',
  })
  lastSyncAt?: Date | null;

  @ApiProperty({
    type: String,
    required: false,
    nullable: true,
    example: null,
  })
  lastError?: string | null;

  @ApiProperty({ type: Number, required: true, example: 0 })
  consecutiveFailures: number;

  @ApiProperty({ type: IntegrationCacheDto, required: true, nullable: true })
  cache: IntegrationCacheDto | null;
}
