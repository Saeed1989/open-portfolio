import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false } })
export class User {
  @Prop({ required: true, enum: ['github', 'google'] })
  provider: 'github' | 'google';

  @Prop({ required: true })
  providerId: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ default: '' })
  avatarUrl: string;

  @Prop({ default: Date.now })
  lastLoginAt: Date;

  @Prop({ required: true, enum: ['active', 'suspended'], default: 'active' })
  status: 'active' | 'suspended';
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ provider: 1, providerId: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
