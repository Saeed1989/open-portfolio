import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../../schemas/user.schema';
import { AccessTokenService } from '../access-token.service';
import { AuthFlowError, resolveEmailCollision } from '../auth-flow.error';
import { AUTH_CONFIG, type AuthConfig } from '../auth.config';
import { POST_LOGIN_PATHS, validReturnTo } from '../return-to';
import { SessionService } from '../session/session.service';
import { TokenCipher } from '../token-cipher';
import {
  buildProviders,
  type AuthProvider,
  type OAuthProvider,
  type ProviderProfile,
} from './providers';

/** What the state cookie carries between start and callback (FR-AUTH-8). */
interface OAuthState {
  readonly state: string;
  readonly verifier: string;
  readonly provider: AuthProvider;
  readonly returnTo?: string;
}

export interface Started {
  readonly stateCookie: string;
  readonly redirectTo: string;
}

export interface SignedIn {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly redirectTo: string;
}

@Injectable()
export class OAuthService {
  private readonly providers: Record<AuthProvider, OAuthProvider>;

  constructor(
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly cipher: TokenCipher,
    private readonly accessTokens: AccessTokenService,
    private readonly sessions: SessionService,
  ) {
    this.providers = buildProviders(config);
  }

  start(provider: AuthProvider, returnTo: unknown): Started {
    const verifier = randomBytes(32).toString('base64url');
    const kept = validReturnTo(returnTo);
    const payload: OAuthState = {
      state: randomBytes(32).toString('base64url'),
      verifier,
      provider,
      ...(kept && { returnTo: kept }),
    };
    return {
      stateCookie: Buffer.from(JSON.stringify(payload)).toString('base64url'),
      redirectTo: this.providers[provider].authorizeUrl({
        redirectUri: this.redirectUri(provider),
        state: payload.state,
        codeChallenge: createHash('sha256')
          .update(verifier)
          .digest('base64url'),
      }),
    };
  }

  /**
   * §2.5 steps 4–7, in order. Throws `AuthFlowError` on any refusal; creates
   * a user and a session, never a portfolio (FR-AUTH-2).
   */
  async callback(
    provider: AuthProvider,
    stateCookie: string | undefined,
    query: { code?: unknown; state?: unknown },
  ): Promise<SignedIn> {
    /* 1. `state` first, before anything reaches the provider (FR-AUTH-8). */
    const saved = parseState(stateCookie);
    if (
      !saved ||
      saved.provider !== provider ||
      typeof query.state !== 'string' ||
      !sameString(query.state, saved.state)
    ) {
      throw new AuthFlowError('invalid_state');
    }
    if (typeof query.code !== 'string' || !query.code) {
      throw new AuthFlowError('provider_error');
    }

    /* 2–3. Exchange, then profile and verified email (FR-AUTH-9). */
    const oauth = this.providers[provider];
    const providerToken = await oauth.exchange(
      query.code,
      saved.verifier,
      this.redirectUri(provider),
    );
    const profile = await oauth.profile(providerToken);

    /* 4–6. */
    const user = await this.upsertUser(provider, profile, providerToken);
    if (user.status === 'suspended') throw new AuthFlowError('suspended');

    /* 7. */
    const refreshToken = await this.sessions.create(user._id);
    return {
      accessToken: this.accessTokens.sign(user._id.toHexString()),
      refreshToken,
      redirectTo:
        this.config.adminOrigin +
        (validReturnTo(saved.returnTo) ?? POST_LOGIN_PATHS[0]),
    };
  }

  /** Where every failure lands; only the code reaches the browser. */
  failureUrl(code: string): string {
    return `${this.config.adminOrigin}/?auth_error=${encodeURIComponent(code)}`;
  }

  private redirectUri(provider: AuthProvider): string {
    return `${this.config.adminOrigin}/api/auth/${provider}/callback`;
  }

  /*
   * Keyed by (provider, providerId). An existing user gets fresh display
   * fields, `lastLoginAt`, and token; its email is left alone, since changing
   * it could collide with another user's (open question 15).
   */
  private async upsertUser(
    provider: AuthProvider,
    profile: ProviderProfile,
    providerToken: string,
  ): Promise<{ _id: Types.ObjectId; status: User['status'] }> {
    const fields = {
      displayName: profile.displayName,
      ...(profile.avatarUrl && { avatarUrl: profile.avatarUrl }),
      lastLoginAt: new Date(),
      encryptedProviderToken: this.cipher.encrypt(providerToken),
    };

    const existing = await this.users
      .findOneAndUpdate(
        { provider, providerId: profile.providerId },
        { $set: fields },
        { projection: { status: 1 } },
      )
      .lean();
    if (existing) return existing;

    if (await this.users.exists({ email: profile.email })) {
      resolveEmailCollision();
    }

    const created = await this.users.create({
      provider,
      providerId: profile.providerId,
      email: profile.email,
      status: 'active',
      ...fields,
    });
    return { _id: created._id, status: created.status };
  }
}

function parseState(cookie: string | undefined): OAuthState | null {
  if (!cookie) return null;
  try {
    const value = JSON.parse(Buffer.from(cookie, 'base64url').toString());
    return typeof value?.state === 'string' &&
      typeof value.verifier === 'string' &&
      typeof value.provider === 'string'
      ? (value as OAuthState)
      : null;
  } catch {
    return null;
  }
}

function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
