import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TenantScope } from '../../common/decorators/tenant.decorator';
import { Portfolio } from '../../schemas/portfolio.schema';

/** The only shape `users._id` serialises to. */
const USER_ID = /^[0-9a-f]{24}$/i;

/** An admin request, once the guard has resolved who it acts for. */
export interface AdminRequest extends IncomingMessage, Writable<TenantScope> {}

type Writable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * Admin requests carry two headers and the guard reads both. `X-Api-Key`
 * proves the caller is `edge`; `X-User-Id` says which tenant it speaks for
 * (FR-AUTH-12, FR-TEN-4). Neither is sufficient alone: the key names no
 * tenant, and the user id is a value any client can set.
 *
 * No cookie is parsed and no session is looked up — the caller already
 * resolved the session (SRS §2.6). Having accepted the identity, the guard
 * resolves the tenant's portfolio once, so that scope resolution has one
 * implementation and every query below it is scoped by the result.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly keyDigest: Buffer;

  constructor(
    config: ConfigService,
    @InjectModel(Portfolio.name) private readonly portfolios: Model<Portfolio>,
  ) {
    this.keyDigest = digest(config.getOrThrow<string>('ADMIN_API_KEY'));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    /* One indexed read on a unique index. A tenant with no portfolio is not
       an error here — §7.2 has three routes that answer without one. */
    const portfolio = await this.portfolios
      .findOne({ userId: new Types.ObjectId(userId) })
      .select('_id')
      .lean();

    request.userId = userId;
    request.portfolioId = portfolio ? portfolio._id.toHexString() : null;
    return true;
  }
}

/* Hashing first gives both sides a fixed 32 bytes, so the comparison is
   constant-time over the presented key's length as well as its content. */
function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}
