import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Session } from '../../schemas/session.schema';

const DAY_MS = 24 * 60 * 60 * 1000;
const IDLE_WINDOW_MS = 30 * DAY_MS;
const ABSOLUTE_WINDOW_MS = 90 * DAY_MS;

/** A freshly minted refresh token and the user it belongs to. */
export interface IssuedRefresh {
  readonly userId: string;
  readonly refreshToken: string;
}

/**
 * Refresh-token sessions (§5.8). The raw token leaves this service only for
 * the refresh cookie; `sessions` holds its hash (FR-AUTH-10).
 */
@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name) private readonly sessions: Model<Session>,
  ) {}

  async create(userId: Types.ObjectId): Promise<string> {
    const refreshToken = mintToken();
    const now = Date.now();
    await this.sessions.create({
      tokenHash: hash(refreshToken),
      userId,
      idleExpiresAt: new Date(now + IDLE_WINDOW_MS),
      absoluteExpiresAt: new Date(now + ABSOLUTE_WINDOW_MS),
    });
    return refreshToken;
  }

  /**
   * FR-AUTH-18. One conditional write rotates the token, so two refreshes
   * cannot both succeed. A token that is only the previous one is reuse and
   * revokes the session — including when two tabs refresh at once
   * (open question 17). `users` is not read.
   */
  async rotate(
    refreshToken: string | undefined,
  ): Promise<IssuedRefresh | null> {
    if (!refreshToken) return null;
    const presented = hash(refreshToken);
    const next = mintToken();
    const now = new Date();

    const session = await this.sessions
      .findOneAndUpdate(
        {
          tokenHash: presented,
          revokedAt: null,
          idleExpiresAt: { $gt: now },
          absoluteExpiresAt: { $gt: now },
        },
        {
          $set: {
            previousTokenHash: presented,
            tokenHash: hash(next),
            idleExpiresAt: new Date(now.getTime() + IDLE_WINDOW_MS),
          },
        },
        { projection: { userId: 1 } },
      )
      .lean();

    if (session) {
      return { userId: session.userId.toHexString(), refreshToken: next };
    }

    await this.sessions.updateOne(
      { previousTokenHash: presented, revokedAt: null },
      { $set: { revokedAt: now } },
    );
    return null;
  }

  /** FR-AUTH-14: the one session the refresh cookie names, if any. */
  async revoke(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.sessions.updateOne(
      { tokenHash: hash(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  /** FR-AUTH-14 logout-all, and FR-AUTH-17's revocation by user id. */
  async revokeAll(userId: string): Promise<void> {
    await this.sessions.updateMany(
      { userId: new Types.ObjectId(userId), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }
}

/** 256 bits of cryptographic randomness (FR-AUTH-10). */
function mintToken(): string {
  return randomBytes(32).toString('base64url');
}

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
