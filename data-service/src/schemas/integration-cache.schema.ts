import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import {
  INTEGRATION_PROVIDERS,
  type IntegrationProvider,
} from './integration-connection.schema';
import { Portfolio } from './portfolio.schema';

/** Written only by the sync worker. */
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
 * Unique: the cache holds the last payload per provider, and the sync
 * worker's upsert would otherwise create duplicates when two runs overlap.
 *
 * Deliberately no TTL on `expiresAt`: expiring the entry would delete the
 * last good payload, which must survive a failed sync and which publish
 * folds against.
 */
IntegrationCacheSchema.index({ portfolioId: 1, provider: 1 }, { unique: true });
