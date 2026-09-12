import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import {
  INTEGRATION_PROVIDERS,
  type IntegrationProvider,
} from './integration-connection.schema';
import { Portfolio } from './portfolio.schema';

/** SRS §5.5. Written only by the sync worker. */
@Schema({ collection: 'integrationCache' })
export class IntegrationCache {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Portfolio.name,
    required: true,
  })
  portfolioId: Types.ObjectId;

  @Prop({ type: String, enum: INTEGRATION_PROVIDERS, required: true })
  provider: IntegrationProvider;

  @Prop({ type: MongooseSchema.Types.Mixed })
  payload: Record<string, unknown>;

  @Prop()
  fetchedAt: Date;

  @Prop()
  expiresAt: Date;

  @Prop()
  stale: boolean;
}

export const IntegrationCacheSchema =
  SchemaFactory.createForClass(IntegrationCache);

/*
 * I-9 (docs/data-design.md §4). Unique: the cache holds the last payload per
 * provider (§5.5), and the sync worker's upsert would otherwise create
 * duplicates when two runs overlap.
 *
 * Deliberately no TTL on `expiresAt`. Expiring the entry would delete the
 * last good payload that FR-INT-3 requires to survive a failed sync and that
 * publish folds against. What the field means is not specified — Q-13.
 */
IntegrationCacheSchema.index({ portfolioId: 1, provider: 1 }, { unique: true });
