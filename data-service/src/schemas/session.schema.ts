import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { User } from './user.schema';

/**
 * SRS §5.8. One document is one refresh-token session: a sign-in and every
 * rotation descended from it (FR-AUTH-18). Hashes are hex SHA-256.
 */
@Schema({
  collection: 'sessions',
  timestamps: { createdAt: true, updatedAt: false },
})
export class Session {
  @Prop({ required: true })
  tokenHash: string;

  @Prop({ type: String, default: null })
  previousTokenHash: string | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true })
  userId: Types.ObjectId;

  createdAt: Date;

  @Prop({ required: true })
  idleExpiresAt: Date;

  @Prop({ required: true })
  absoluteExpiresAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index({ tokenHash: 1 }, { unique: true });
SessionSchema.index({ previousTokenHash: 1 });
SessionSchema.index({ userId: 1 });
