import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { AUTH_CONFIG, type AuthConfig } from './auth.config';

const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

/** What one sign-in attempt keeps in the state cookie (FR-AUTH-8). */
export interface OidcAttempt {
  readonly state: string;
  readonly verifier: string;
  readonly nonce: string;
}

/** The claims sign-in keeps. Every Google token is discarded (FR-AUTH-22). */
export interface GoogleIdentity {
  readonly sub: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
}

/**
 * The Google half of sign-in: the authorization URL, the code exchange, and
 * ID-token validation. Sole holder of the client secret (FR-AUTH-9).
 */
@Injectable()
export class GoogleOidcService {
  private readonly client: OAuth2Client;

  constructor(@Inject(AUTH_CONFIG) private readonly config: AuthConfig) {
    this.client = new OAuth2Client({
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
      redirectUri: config.googleRedirectUri,
      /* Node's own fetch. Left unset, the client loads `node-fetch` by
         dynamic import on first use, which Jest's module sandbox cannot do. */
      transporterOptions: { fetchImplementation: fetch },
    });
  }

  authorizationUrl({ state, verifier, nonce }: OidcAttempt): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.googleClientId,
      redirect_uri: this.config.googleRedirectUri,
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
    return `${AUTHORIZATION_ENDPOINT}?${params.toString()}`;
  }

  /**
   * Exchanges the code and validates the ID token per FR-AUTH-21. Null on any
   * failure; the caller answers `auth_failed` and learns no detail.
   */
  async exchange(
    code: string,
    { verifier, nonce }: OidcAttempt,
  ): Promise<GoogleIdentity | null> {
    try {
      const { tokens } = await this.client.getToken({
        code,
        codeVerifier: verifier,
        redirect_uri: this.config.googleRedirectUri,
      });
      if (!tokens.id_token) return null;

      /* Signature against Google's published keys, `iss`, `aud` and `exp`. */
      const ticket = await this.client.verifyIdToken({
        idToken: tokens.id_token,
        audience: this.config.googleClientId,
      });
      const claims = ticket.getPayload();
      if (
        !claims ||
        !claims.email ||
        claims.nonce !== nonce ||
        claims.email_verified !== true
      ) {
        return null;
      }

      return {
        sub: claims.sub,
        email: claims.email,
        displayName: claims.name ?? claims.email,
        avatarUrl: claims.picture,
      };
    } catch {
      return null;
    }
  }
}
