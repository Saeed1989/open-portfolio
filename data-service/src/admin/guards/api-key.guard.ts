import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** The only shape `users._id` serialises to. */
const USER_ID = /^[0-9a-f]{24}$/i;

/** An admin request, once the guard has resolved who it acts for. */
export interface AdminRequest extends IncomingMessage {
  userId: string;
}

/**
 * Admin requests carry two headers and the guard reads both. `X-Api-Key`
 * proves the caller is `edge`; `X-User-Id` says which tenant it speaks for
 * (FR-AUTH-12, FR-TEN-4). Neither is sufficient alone: the key names no
 * tenant, and the user id is a value any client can set.
 *
 * No cookie is parsed and no session is looked up — the caller already
 * resolved the session (SRS §2.6).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly keyDigest: Buffer;

  constructor(config: ConfigService) {
    this.keyDigest = digest(config.getOrThrow<string>('ADMIN_API_KEY'));
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminRequest>();

    const presented = request.headers['x-api-key'];
    if (
      typeof presented !== 'string' ||
      !timingSafeEqual(digest(presented), this.keyDigest)
    ) {
      throw new UnauthorizedException();
    }

    const userId = request.headers['x-user-id'];
    if (typeof userId !== 'string' || !USER_ID.test(userId)) {
      throw new UnauthorizedException();
    }

    request.userId = userId;
    return true;
  }
}

/* Hashing first gives both sides a fixed 32 bytes, so the comparison is
   constant-time over the presented key's length as well as its content. */
function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}
