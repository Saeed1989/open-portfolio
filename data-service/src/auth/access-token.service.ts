import { Inject, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AUTH_CONFIG, type AuthConfig } from './auth.config';

export const ACCESS_TTL_SECONDS = 15 * 60;

/** The only shape `users._id` serialises to. */
const USER_ID = /^[0-9a-f]{24}$/i;

/**
 * The access JWT (FR-AUTH-11, FR-AUTH-19). Signed and verified here and
 * nowhere else; never stored.
 */
@Injectable()
export class AccessTokenService {
  constructor(@Inject(AUTH_CONFIG) private readonly config: AuthConfig) {}

  /** `sub`, `iat` and `exp`; `kid` in the header. */
  sign(userId: string): string {
    const { kid, key } = this.config.accessJwt.current;
    return jwt.sign({ sub: userId }, key, {
      algorithm: 'HS256',
      keyid: kid,
      expiresIn: ACCESS_TTL_SECONDS,
    });
  }

  /** The user id, or null for any token that does not verify. */
  verify(token: string | undefined): string | null {
    if (!token) return null;

    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || decoded.header.alg !== 'HS256') return null;

    const key = this.keyFor(decoded.header.kid);
    if (!key) return null;

    let payload: string | jwt.JwtPayload;
    try {
      payload = jwt.verify(token, key, { algorithms: ['HS256'] });
    } catch {
      return null;
    }
    if (
      typeof payload === 'string' ||
      typeof payload.exp !== 'number' ||
      typeof payload.sub !== 'string' ||
      !USER_ID.test(payload.sub)
    ) {
      return null;
    }
    return payload.sub;
  }

  /* Current and previous kid only, so a key can rotate without cutting off
     tokens issued in the last 15 minutes (FR-AUTH-19). */
  private keyFor(kid: string | undefined): Buffer | null {
    const { current, previous } = this.config.accessJwt;
    if (kid === current.kid) return current.key;
    if (previous && kid === previous.kid) return previous.key;
    return null;
  }
}
