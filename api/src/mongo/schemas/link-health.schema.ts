import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type LinkHealthDocument = LinkHealth & Document;

@Schema()
export class LinkHealth {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Portfolio' })
  portfolioId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  sectionType: string;

  @Prop({ required: true })
  itemId: string;

  @Prop({ required: true })
  url: string;

  @Prop({ type: Date, default: null })
  lastCheckedAt: Date | null;

  @Prop({ type: Number, default: null })
  statusCode: number | null;

  @Prop({ required: true, enum: ['ok', 'broken', 'unchecked'], default: 'unchecked' })
  state: 'ok' | 'broken' | 'unchecked';

  @Prop({ type: Number, default: 0 })
  consecutiveFailures: number;
}

export const LinkHealthSchema = SchemaFactory.createForClass(LinkHealth);
LinkHealthSchema.index({ portfolioId: 1 });
