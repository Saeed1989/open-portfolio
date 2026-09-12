import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { SECTION_TYPES, type SectionType } from '@portfolio/registry';
import { Portfolio } from './portfolio.schema';

export const LINK_STATES = ['ok', 'broken', 'unchecked'] as const;
export type LinkState = (typeof LINK_STATES)[number];

/** SRS §5.6. */
@Schema({ collection: 'linkHealth' })
export class LinkHealth {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Portfolio.name,
    required: true,
  })
  portfolioId: Types.ObjectId;

  @Prop({ type: String, enum: SECTION_TYPES })
  sectionType: SectionType;

  @Prop()
  itemId: string;

  @Prop()
  url: string;

  @Prop()
  lastCheckedAt: Date;

  @Prop()
  statusCode: number;

  @Prop({ type: String, enum: LINK_STATES })
  state: LinkState;

  @Prop()
  consecutiveFailures: number;
}

export const LinkHealthSchema = SchemaFactory.createForClass(LinkHealth);

/*
 * I-10 (docs/data-design.md §4). Unique, so the weekly check upserts one row
 * per link rather than appending. `url` comes last because one project item
 * carries two links, demo and repository (FR-SEC-PROJ-9), so an item id does
 * not identify a row on its own.
 */
LinkHealthSchema.index(
  { portfolioId: 1, sectionType: 1, itemId: 1, url: 1 },
  { unique: true },
);
