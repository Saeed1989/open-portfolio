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
 * Marks a route that answers for a tenant with no portfolio yet. §7.2 names
 * three: `GET /admin/me`, `GET /admin/slug-availability` and
 * `POST /admin/portfolio`. Every other route answers `404 portfolio_not_found`.
 */
export const AllowWithoutPortfolio = () =>
  SetMetadata(ALLOW_WITHOUT_PORTFOLIO, true);

/** An admin request, once the guard has resolved who it acts for. */
export interface AdminRequest extends IncomingMessage, Writable<TenantScope> {}

type Writable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * An admin request carries one identity input, the `X-User-Id` header
 * `gateway` sets from the identity subrequest and overwrites on every request
 * (FR-AUTH-12, FR-EDGE-4, FR-TEN-4). It is trustworthy only because the
 * request has already shown the API key `gateway` alone holds: one without it
 * is answered before this guard runs (FR-EDGE-5). An absent, empty or
 * malformed value is rejected.
 *
 * No cookie is parsed, no token is verified and no session is looked up — the
 * auth module already resolved the session (SRS §2.6). Having accepted the
 * identity, the guard resolves the tenant's portfolio once, so that scope
 * resolution has one implementation and every query below it is scoped by
 * the result.
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

    /* One indexed read on a unique index. A tenant with no portfolio is not
       an error on the three routes §7.2 lets answer without one. */
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
