import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Session } from './schemas/session.schema';

const DAY_MS = 24 * 60 * 60 * 1000;
/** FR-AUTH-3: 30 days idle, 90 days absolute, whichever falls first. */
export const IDLE_MS = 30 * DAY_MS;
export const ABSOLUTE_MS = 90 * DAY_MS;

/** A refresh token just minted, and the session it now names. */
export interface IssuedSession {
  /** The raw token. It goes to the refresh cookie and nowhere else (FR-AUTH-10). */
  readonly refreshToken: string;
  readonly userId: string;
  /** Already capped at `absoluteExpiresAt`, so it is the earlier of the two. */
  readonly idleExpiresAt: Date;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** 256 bits of cryptographic randomness (FR-AUTH-10). */
function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/** The sole reader and writer of `sessions` (FR-AUTH-13). */
@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name) private readonly sessions: Model<Session>,
  ) {}

  async create(userId: string): Promise<IssuedSession> {
    const refreshToken = newToken();
    const now = Date.now();
    /* 30 days is inside 90, so the idle window needs no cap at creation. */
    const idleExpiresAt = new Date(now + IDLE_MS);
    await this.sessions.create({
      tokenHash: hashToken(refreshToken),
      previousTokenHash: null,
      userId: new Types.ObjectId(userId),
      idleExpiresAt,
      absoluteExpiresAt: new Date(now + ABSOLUTE_MS),
      revokedAt: null,
    });
    return { refreshToken, userId, idleExpiresAt };
  }

  /**
   * FR-AUTH-18. One atomic update decides the rotation, so two requests
   * presenting the same token cannot both win. Null on any failure; a token
   * matching `previousTokenHash` is reuse and revokes the session.
   */
  async rotate(presented: string): Promise<IssuedSession | null> {
    const presentedHash = hashToken(presented);
    const refreshToken = newToken();
    const now = new Date();

    const rotated = await this.sessions
      .findOneAndUpdate(
        {
          tokenHash: presentedHash,
          revokedAt: null,
          idleExpiresAt: { $gt: now },
          absoluteExpiresAt: { $gt: now },
        },
        [
          {
            $set: {
              previousTokenHash: '$tokenHash',
              tokenHash: hashToken(refreshToken),
              idleExpiresAt: {
                $min: [new Date(now.getTime() + IDLE_MS), '$absoluteExpiresAt'],
              },
            },
          },
        ],
        { new: true },
      )
      .lean();

    if (!rotated) {
      await this.sessions.updateOne(
        { previousTokenHash: presentedHash, revokedAt: null },
        { $set: { revokedAt: now } },
      );
      return null;
    }

    return {
      refreshToken,
      userId: rotated.userId.toHexString(),
      idleExpiresAt: rotated.idleExpiresAt,
    };
  }

  /** Revokes the session the token currently names, if any (FR-AUTH-14). */
  async revoke(presented: string): Promise<void> {
    await this.sessions.updateOne(
      { tokenHash: hashToken(presented), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.sessions.updateMany(
      { userId: new Types.ObjectId(userId), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }
}
