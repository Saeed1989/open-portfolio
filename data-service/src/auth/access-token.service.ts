import { Inject, Injectable } from '@nestjs/common';
import { jwtVerify, SignJWT } from 'jose';
import { AUTH_CONFIG, type AuthConfig } from './auth.config';

/** FR-AUTH-3: an access JWT expires 15 minutes after issue. */
export const ACCESS_TTL_SECONDS = 900;

/**
 * Signs and verifies the access JWT (FR-AUTH-11, FR-AUTH-19). The only holder
 * of the signing keys; nothing outside `src/auth` verifies a token.
 */
@Injectable()
export class AccessTokenService {
  constructor(@Inject(AUTH_CONFIG) private readonly config: AuthConfig) {}

  sign(userId: string): Promise<string> {
    const { jwtKeys, jwtCurrentKid } = this.config;
    const issuedAt = Math.floor(Date.now() / 1000);
    return new SignJWT()
      .setProtectedHeader({ alg: 'HS256', kid: jwtCurrentKid })
      .setSubject(userId)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + ACCESS_TTL_SECONDS)
      .sign(jwtKeys.get(jwtCurrentKid)!);
  }

  /** The user id the token names, or null on any failure. */
  async verify(token: string | undefined): Promise<string | null> {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(
        token,
        ({ kid }) => {
          const key =
            kid === undefined ? undefined : this.config.jwtKeys.get(kid);
          if (!key) throw new Error('unknown kid');
          return key;
        },
        { algorithms: ['HS256'], requiredClaims: ['sub', 'iat', 'exp'] },
      );
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }
}
