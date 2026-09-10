import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type IntegrationCacheDocument = IntegrationCache & Document;

@Schema()
export class IntegrationCache {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Portfolio' })
  portfolioId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['github', 'rss'] })
  provider: 'github' | 'rss';

  @Prop({ type: MongooseSchema.Types.Mixed })
  payload: unknown;

  @Prop({ required: true })
  fetchedAt: Date;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ required: true, default: false })
  stale: boolean;
}

export const IntegrationCacheSchema = SchemaFactory.createForClass(IntegrationCache);
IntegrationCacheSchema.index({ portfolioId: 1, provider: 1 }, { unique: true });
