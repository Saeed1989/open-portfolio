import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Portfolio } from './portfolio.schema';

/** SRS §5.3. Every query is scoped by `portfolioId`. */
@Schema({ collection: 'media' })
export class Media {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Portfolio.name,
    required: true,
  })
  portfolioId: Types.ObjectId;

  @Prop({ required: true })
  storageKey: string;

  @Prop()
  url: string;

  @Prop()
  mimeType: string;

  @Prop()
  bytes: number;

  @Prop()
  width: number;

  @Prop()
  height: number;

  @Prop()
  altText: string;

  @Prop()
  uploadedAt: Date;
}

export const MediaSchema = SchemaFactory.createForClass(Media);

MediaSchema.index({ portfolioId: 1 });
