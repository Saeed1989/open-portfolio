import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Portfolio } from './portfolio.schema';

/**
 * Providers that sync through a connection. GitHub stat cards and Credly
 * badges are embedded by URL and deliberately have no row here (§5.4).
 */
export const INTEGRATION_PROVIDERS = [
  'github',
  'rss',
  'x',
  'linkedin',
] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export const CONNECTION_STATUSES = ['ok', 'failing', 'revoked'] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

/** SRS §5.4. */
@Schema({ collection: 'integrationConnections' })
export class IntegrationConnection {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Portfolio.name,
    required: true,
  })
  portfolioId: Types.ObjectId;

  @Prop({ type: String, enum: INTEGRATION_PROVIDERS, required: true })
  provider: IntegrationProvider;

  /** `{ username | feedUrl | ... }`, per provider. */
  @Prop({ type: MongooseSchema.Types.Mixed })
  config: Record<string, unknown>;

  /** Ciphertext. Encrypted at rest (FR-INT-6). */
  @Prop()
  credentials: string;

  @Prop({ type: String, enum: CONNECTION_STATUSES })
  status: ConnectionStatus;

  @Prop()
  lastSyncAt: Date;

  @Prop()
  lastError: string;

  @Prop()
  consecutiveFailures: number;
}

export const IntegrationConnectionSchema = SchemaFactory.createForClass(
  IntegrationConnection,
);
