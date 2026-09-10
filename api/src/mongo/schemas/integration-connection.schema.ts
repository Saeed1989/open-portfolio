import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type IntegrationConnectionDocument = IntegrationConnection & Document;

@Schema({ _id: false })
class IntegrationConfig {
  @Prop({ type: String })
  username?: string;

  @Prop({ type: String })
  feedUrl?: string;
}

const IntegrationConfigSchema = SchemaFactory.createForClass(IntegrationConfig);

@Schema({ timestamps: true })
export class IntegrationConnection {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Portfolio' })
  portfolioId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['github', 'rss'] })
  provider: 'github' | 'rss';

  @Prop({ type: IntegrationConfigSchema, default: {} })
  config: IntegrationConfig;

  @Prop({ type: Buffer })
  credentials: Buffer;

  @Prop({ required: true, enum: ['ok', 'failing', 'revoked'], default: 'ok' })
  status: 'ok' | 'failing' | 'revoked';

  @Prop({ type: Date, default: null })
  lastSyncAt: Date | null;

  @Prop({ type: String, default: null })
  lastError: string | null;

  @Prop({ type: Number, default: 0 })
  consecutiveFailures: number;
}

export const IntegrationConnectionSchema = SchemaFactory.createForClass(IntegrationConnection);
IntegrationConnectionSchema.index({ portfolioId: 1 });
