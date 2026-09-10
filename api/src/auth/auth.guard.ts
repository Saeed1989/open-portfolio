import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Session authentication guard for the admin surface.
 *
 * Delegates to Passport's `req.isAuthenticated()` which returns true only
 * when a user has been serialised into the session by a successful OAuth flow.
 * Returns HTTP 401 on failure — never redirects, so the admin client can
 * distinguish "not logged in" from a legitimate API error.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (req.isAuthenticated()) {
      return true;
    }

    throw new UnauthorizedException('Authentication required');
  }
}
