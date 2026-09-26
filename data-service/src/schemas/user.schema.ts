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

  /** The provider's OAuth token, AES-256-GCM encrypted (NFR-SEC-3). Read
      only through the auth module's interface (FR-AUTH-4, FR-AUTH-17). */
  @Prop()
  encryptedProviderToken?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ provider: 1, providerId: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
