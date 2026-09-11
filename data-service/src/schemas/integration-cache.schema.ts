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
