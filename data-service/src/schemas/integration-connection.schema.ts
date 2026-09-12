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

  /*
   * Ciphertext. A typed placeholder only — nothing in this service
   * encrypts or decrypts it yet, so a value written here today is
   * whatever the caller passed.
   *
   * TODO(NFR-SEC-3): encrypt at rest with a key held outside the
   * database. Until that lands, no real credential may be stored.
   */
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

/*
 * I-7 (docs/data-design.md §4). Unique because §7.2 addresses a connection
 * by `:provider` alone, which presumes at most one per provider per tenant.
 * §5.4 does not state that constraint — open question Q-16's sibling Q-11.
 * `portfolioId` leads because every admin read is scoped by tenant
 * (FR-TEN-4), so the prefix alone serves the tenant-wide list.
 */
IntegrationConnectionSchema.index(
  { portfolioId: 1, provider: 1 },
  { unique: true },
);
