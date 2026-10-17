import type { IncomingMessage } from 'node:http';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TenantScope } from '../../common/decorators/tenant.decorator';
import { Portfolio } from '../../schemas/portfolio.schema';

/** The only shape `users._id` serialises to. */
const USER_ID = /^[0-9a-f]{24}$/i;

const ALLOW_WITHOUT_PORTFOLIO = 'allowWithoutPortfolio';

/**
 * Marks a route that answers for a tenant with no portfolio yet:
 * `GET /admin/me`, `GET /admin/slug-availability` and `POST /admin/portfolio`.
 * Every other route answers `404 portfolio_not_found`.
 */
export const AllowWithoutPortfolio = () =>
  SetMetadata(ALLOW_WITHOUT_PORTFOLIO, true);

/** An admin request, once the guard has resolved who it acts for. */
export interface AdminRequest extends IncomingMessage, Writable<TenantScope> {}

type Writable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * Trusts the `X-User-Id` header `gateway` sets, which is safe only because a
 * request without the gateway API key is answered before this guard runs.
 * Parses no cookie and verifies no token. Resolves the tenant's portfolio
 * once, so scope resolution has a single implementation.
 */
@Injectable()
export class UserIdGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(Portfolio.name) private readonly portfolios: Model<Portfolio>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();

    const userId = request.headers['x-user-id'];
    if (typeof userId !== 'string' || !USER_ID.test(userId)) {
      throw new UnauthorizedException();
    }

    /* A tenant with no portfolio is not an error on a route marked
       `AllowWithoutPortfolio`. */
    const portfolio = await this.portfolios
      .findOne({ userId: new Types.ObjectId(userId) })
      .select('_id')
      .lean();
    if (
      !portfolio &&
      !this.reflector.getAllAndOverride<boolean>(ALLOW_WITHOUT_PORTFOLIO, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      throw new NotFoundException('portfolio_not_found');
    }

    request.userId = userId;
    request.portfolioId = portfolio ? portfolio._id.toHexString() : null;
    return true;
  }
}
