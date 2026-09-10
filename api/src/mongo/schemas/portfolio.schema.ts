import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PortfolioDocument = Portfolio & Document;

@Schema({ _id: false })
class ContentTree {
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  sections: unknown[];

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  theme: unknown;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  seo: unknown;
}

const ContentTreeSchema = SchemaFactory.createForClass(ContentTree);

@Schema({ timestamps: true })
export class Portfolio {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, lowercase: true })
  slug: string;

  @Prop({ required: true, enum: ['unpublished', 'published', 'suspended'], default: 'unpublished' })
  status: 'unpublished' | 'published' | 'suspended';

  @Prop({ type: Number })
  registryVersion: number;

  @Prop({ type: String })
  presetId: string;

  @Prop({ type: ContentTreeSchema })
  draft: ContentTree;

  @Prop({ type: ContentTreeSchema, default: null })
  published: ContentTree | null;

  @Prop({ type: [String], default: [] })
  slugHistory: string[];

  @Prop({ type: Date, default: null })
  publishedAt: Date | null;

  @Prop({ type: Number, default: 0 })
  version: number;
}

export const PortfolioSchema = SchemaFactory.createForClass(Portfolio);
PortfolioSchema.index({ userId: 1 }, { unique: true });
PortfolioSchema.index({ slug: 1 }, { unique: true });
PortfolioSchema.index({ slugHistory: 1 }, { sparse: true });
