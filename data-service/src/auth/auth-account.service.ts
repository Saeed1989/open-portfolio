import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, type AuthProvider } from '../schemas/user.schema';
import { SessionService } from './session/session.service';
import { TokenCipher } from './token-cipher';

export interface DisplayFields {
  readonly provider: AuthProvider;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
}

/**
 * FR-AUTH-17: the only route by which another module reaches `users` or
 * `sessions`, and the auth module's only export.
 */
@Injectable()
export class AuthAccountService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly sessions: SessionService,
    private readonly cipher: TokenCipher,
  ) {}

  /** For `GET /admin/me`. Null when no such user exists. */
  async getDisplayFields(userId: string): Promise<DisplayFields | null> {
    const user = await this.users
      .findById(new Types.ObjectId(userId))
      .select('provider email displayName avatarUrl')
      .lean();
    if (!user) return null;
    return {
      provider: user.provider,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  }

  /** The decrypted GitHub token (FR-AUTH-4), or null for a non-GitHub user. */
  async getGitHubToken(userId: string): Promise<string | null> {
    const user = await this.users
      .findById(new Types.ObjectId(userId))
      .select('provider encryptedProviderToken')
      .lean();
    if (user?.provider !== 'github' || !user.encryptedProviderToken) {
      return null;
    }
    return this.cipher.decrypt(user.encryptedProviderToken);
  }

  /** Account deletion and operator suspension (FR-AUTH-13). */
  revokeAllSessions(userId: string): Promise<void> {
    return this.sessions.revokeAll(userId);
  }
}
