import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { SECTION_TYPES, type SectionType } from '@portfolio/registry';

export const PORTFOLIO_STATUSES = [
  'unpublished',
  'published',
  'suspended',
] as const;
export type PortfolioStatus = (typeof PORTFOLIO_STATUSES)[number];

export const ANALYTICS_PROVIDERS = ['plausible', 'ga'] as const;
export type AnalyticsProvider = (typeof ANALYTICS_PROVIDERS)[number];

/**
 * One entry in `draft.sections`. `content` is shaped by the registry's
 * descriptor for `type`, never by this schema.
 */
@Schema({ _id: false })
export class DraftSection {
  @Prop({ type: String, enum: SECTION_TYPES, required: true })
  type: SectionType;

  @Prop({ required: true })
  enabled: boolean;

  @Prop({ required: true })
  order: number;

  @Prop({ type: MongooseSchema.Types.Mixed })
  content: Record<string, unknown>;
}

export const DraftSectionSchema = SchemaFactory.createForClass(DraftSection);

/** `id` is the Plausible domain or the GA measurement id. */
@Schema({ _id: false, id: false })
export class Analytics {
  @Prop({ type: String, enum: ANALYTICS_PROVIDERS, required: true })
  provider: AnalyticsProvider;

  @Prop({ required: true })
  id: string;
}

export const AnalyticsSchema = SchemaFactory.createForClass(Analytics);

@Schema({ _id: false })
export class Draft {
  @Prop({ type: [DraftSectionSchema] })
  sections: DraftSection[];

  @Prop({ type: MongooseSchema.Types.Mixed })
  theme: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  seo: Record<string, unknown>;

  @Prop({ type: AnalyticsSchema, default: null })
  analytics: Analytics | null;
}

export const DraftSchema = SchemaFactory.createForClass(Draft);

/**
 * Stored in the shape it is served in: `config` and `data` are the two
 * halves of the render payload, written by the registry's builder. `source` is
 * never served and the public read excludes it by projection.
 */
@Schema({ _id: false })
export class PublishedTree {
  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  config: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  data: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  source: Record<string, unknown>;
}

export const PublishedTreeSchema = SchemaFactory.createForClass(PublishedTree);

/** A retired slug, held for 90 days to issue a 301. */
@Schema({ _id: false })
export class SlugHistoryEntry {
  @Prop({ required: true })
  slug: string;

  @Prop({ required: true })
  retiredAt: Date;
}

export const SlugHistoryEntrySchema =
  SchemaFactory.createForClass(SlugHistoryEntry);

@Schema({ collection: 'portfolios', timestamps: true })
export class Portfolio {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, lowercase: true })
  slug: string;

  @Prop({ type: [SlugHistoryEntrySchema] })
  slugHistory: SlugHistoryEntry[];

  @Prop({ type: String, enum: PORTFOLIO_STATUSES, required: true })
  status: PortfolioStatus;

  @Prop()
  registryVersion: number;

  @Prop()
  presetId: string;

  @Prop({ type: DraftSchema, required: true })
  draft: Draft;

  @Prop({ type: PublishedTreeSchema, default: null })
  published: PublishedTree | null;

  @Prop({ type: Date })
  publishedAt: Date | null;

  @Prop()
  version: number;

  /**
   * The draft's concurrency token, served as the admin ETag. Every draft
   * write increments it in the same conditional update. `version` cannot
   * serve: it moves only on writes to `published`.
   */
  @Prop({ default: 0 })
  draftRevision: number;

  /**
   * The `draftRevision` the last publish read its draft at; null until the
   * first. The draft holds unpublished changes while the two differ.
   */
  @Prop({ type: Number, default: null })
  publishedDraftRevision: number | null;

  createdAt: Date;

  updatedAt: Date;
}

export const PortfolioSchema = SchemaFactory.createForClass(Portfolio);

PortfolioSchema.index({ userId: 1 }, { unique: true });
PortfolioSchema.index({ slug: 1 }, { unique: true });

/*
 * Multikey, not unique: a unique index here would not stop a tenant claiming
 * another's retired slug as a current one, so that constraint belongs to the
 * write path. Serves the retired-slug redirect lookup.
 */
PortfolioSchema.index({ 'slugHistory.slug': 1 });
