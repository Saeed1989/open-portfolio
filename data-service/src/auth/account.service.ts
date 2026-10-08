import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, mongo, Types } from 'mongoose';
import type { AccountAccess, AccountDisplayFields } from './account-access';
import type { GoogleIdentity } from './google-oidc.service';
import { User } from './schemas/user.schema';
import { SessionService } from './session.service';

export type SignInResult =
  | { readonly userId: string }
  | { readonly refused: 'auth_failed' | 'account_suspended' };

/**
 * The sole reader and writer of `users` (FR-AUTH-13), and the implementation
 * of the interface other modules reach accounts through (FR-AUTH-17).
 */
@Injectable()
export class AccountService implements AccountAccess {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly sessions: SessionService,
  ) {}

  /**
   * Upserts by `(provider: 'google', providerId: sub)` and refreshes the
   * profile fields (FR-AUTH-21). A suspended user is refused before any
   * write (FR-AUTH-9). Creates a user and nothing else (FR-AUTH-2).
   */
  async signInWithGoogle(identity: GoogleIdentity): Promise<SignInResult> {
    const key = { provider: 'google', providerId: identity.sub } as const;

    const existing = await this.users.findOne(key).select('status').lean();
    if (existing?.status === 'suspended') {
      return { refused: 'account_suspended' };
    }

    try {
      const user = await this.users
        .findOneAndUpdate(
          key,
          {
            $set: {
              email: identity.email,
              displayName: identity.displayName,
              avatarUrl: identity.avatarUrl,
              lastLoginAt: new Date(),
            },
            $setOnInsert: { status: 'active' },
          },
          { upsert: true, new: true },
        )
        .select('_id')
        .lean();
      return { userId: user._id.toHexString() };
    } catch (error) {
      if (!(error instanceof mongo.MongoServerError && error.code === 11000)) {
        throw error;
      }
      /* The unique index on `email` (§5.1): another user holds the address. */
      this.logger.warn(
        `sign-in refused: email collision for sub ${identity.sub}`,
      );
      return { refused: 'auth_failed' };
    }
  }

  async getDisplayFields(userId: string): Promise<AccountDisplayFields | null> {
    const user = await this.users.findById(new Types.ObjectId(userId)).lean();
    if (!user) return null;
    return {
      provider: user.provider,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  }

  revokeAllForUser(userId: string): Promise<void> {
    return this.sessions.revokeAllForUser(userId);
  }
}
