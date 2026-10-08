import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { AdminRequest } from './user-id.guard';

const LIMIT = 30;
const WINDOW_MS = 60_000;

/**
 * 30 requests per minute per tenant, in a fixed window. Runs after
 * `UserIdGuard`, which has already resolved `userId`.
 *
 * Counts live in this process's memory, so the limit holds per `api`
 * instance, not across replicas, and resets on restart.
 */
@Injectable()
export class PerUserRateLimitGuard implements CanActivate {
  private readonly windows = new Map<
    string,
    { start: number; count: number }
  >();

  canActivate(context: ExecutionContext): boolean {
    const { userId } = context.switchToHttp().getRequest<AdminRequest>();
    const now = Date.now();

    const window = this.windows.get(userId);
    if (!window || now - window.start >= WINDOW_MS) {
      this.windows.set(userId, { start: now, count: 1 });
      return true;
    }
    if (window.count >= LIMIT) {
      throw new HttpException(
        { code: 'rate_limited', message: 'Too many requests.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    window.count += 1;
    return true;
  }
}
