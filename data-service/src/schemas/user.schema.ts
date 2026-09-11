import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export const AUTH_PROVIDERS = ['github', 'google'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export const USER_STATUSES = ['active', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** SRS §5.1. */
@Schema({
  collection: 'users',
  timestamps: { createdAt: true, updatedAt: false },
})
export class User {
  @Prop({ type: String, enum: AUTH_PROVIDERS, required: true })
  provider: AuthProvider;

  @Prop({ required: true })
  providerId: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  displayName: string;

  @Prop()
  avatarUrl: string;

  createdAt: Date;

  @Prop()
  lastLoginAt: Date;

  @Prop({ type: String, enum: USER_STATUSES })
  status: UserStatus;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ provider: 1, providerId: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
