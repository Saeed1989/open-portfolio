import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { GATEWAY_KEYS } from './gateway-key.config';

/* Digests are compared, so both sides are the same length whatever was sent. */
const digest = (value: string): Buffer =>
  createHash('sha256').update(value).digest();

/**
 * A request to `/auth/*` or `/admin/*` carries an `X-Api-Key` this process
 * accepts, or is answered `401` with no body here — before any guard,
 * controller or database access, so `X-User-Id` is never read on a request
 * that has not passed. The key identifies `gateway`, not a tenant.
 */
@Injectable()
export class GatewayKeyMiddleware implements NestMiddleware {
  private readonly accepted: readonly Buffer[];

  constructor(@Inject(GATEWAY_KEYS) keys: readonly string[]) {
    this.accepted = keys.map(digest);
  }

  use(
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void,
  ): void {
    const presented = request.headers['x-api-key'];
    const candidate = digest(typeof presented === 'string' ? presented : '');

    /* Every accepted key is compared, in constant time, with no early exit. */
    let valid = false;
    for (const key of this.accepted) {
      if (timingSafeEqual(candidate, key)) valid = true;
    }

    if (!valid) {
      response.statusCode = 401;
      response.end();
      return;
    }
    next();
  }
}
