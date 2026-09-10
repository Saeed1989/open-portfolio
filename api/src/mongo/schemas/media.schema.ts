import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type MediaDocument = Media & Document;

@Schema({ timestamps: { createdAt: 'uploadedAt', updatedAt: false } })
export class Media {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Portfolio' })
  portfolioId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  storageKey: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  bytes: number;

  @Prop({ type: Number, default: null })
  width: number | null;

  @Prop({ type: Number, default: null })
  height: number | null;

  @Prop({ required: true })
  altText: string;

  @Prop({ type: String, default: null })
  srcset: string | null;

  @Prop({ default: Date.now })
  uploadedAt: Date;
}

export const MediaSchema = SchemaFactory.createForClass(Media);
MediaSchema.index({ portfolioId: 1 });
