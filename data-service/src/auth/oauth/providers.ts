import { AUTH_PROVIDERS, type AuthProvider } from '../../schemas/user.schema';
import { AuthFlowError } from '../auth-flow.error';
import type { AuthConfig } from '../auth.config';

export { AUTH_PROVIDERS, type AuthProvider };

export interface ProviderProfile {
  readonly providerId: string;
  /** Verified by the provider; unverified addresses never get this far. */
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
}

export interface AuthorizeParams {
  readonly redirectUri: string;
  readonly state: string;
  readonly codeChallenge: string;
}

export interface OAuthProvider {
  authorizeUrl(params: AuthorizeParams): string;
  /** The provider's access token. */
  exchange(
    code: string,
    verifier: string,
    redirectUri: string,
  ): Promise<string>;
  profile(accessToken: string): Promise<ProviderProfile>;
}

const TIMEOUT_MS = 10_000;

/*
 * Any provider failure becomes `provider_error`: its message, status and body
 * stay here and never reach the browser.
 */
async function getJson<T>(
  url: string,
  init: RequestInit & { headers: Record<string, string> },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new AuthFlowError('provider_error');
  }
  if (!response.ok) throw new AuthFlowError('provider_error');
  return (await response.json()) as T;
}

function authorizeUrl(
  base: string,
  clientId: string,
  scope: string,
  params: AuthorizeParams,
): string {
  const url = new URL(base);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    scope,
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
  }).toString();
  return url.toString();
}

function github({
  clientId,
  clientSecret,
}: AuthConfig['github']): OAuthProvider {
  const api = (token: string) => ({
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'openfolio',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  return {
    authorizeUrl: (params) =>
      authorizeUrl(
        'https://github.com/login/oauth/authorize',
        clientId,
        'read:user user:email',
        params,
      ),

    async exchange(code, verifier, redirectUri) {
      /* GitHub answers a refused exchange with 200 and an `error` field. */
      const body = await getJson<{ access_token?: string }>(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
            code_verifier: verifier,
          }).toString(),
        },
      );
      if (!body.access_token) throw new AuthFlowError('provider_error');
      return body.access_token;
    },

    async profile(token) {
      const [user, emails] = await Promise.all([
        getJson<{
          id: number;
          login: string;
          name: string | null;
          avatar_url?: string;
        }>('https://api.github.com/user', api(token)),
        getJson<{ email: string; primary: boolean; verified: boolean }[]>(
          'https://api.github.com/user/emails',
          api(token),
        ),
      ]);
      const primary = emails.find((e) => e.primary && e.verified);
      if (!primary) throw new AuthFlowError('email_unverified');
      return {
        providerId: String(user.id),
        email: primary.email,
        displayName: user.name || user.login,
        avatarUrl: user.avatar_url,
      };
    },
  };
}

function google({
  clientId,
  clientSecret,
}: AuthConfig['google']): OAuthProvider {
  return {
    authorizeUrl: (params) =>
      authorizeUrl(
        'https://accounts.google.com/o/oauth2/v2/auth',
        clientId,
        'openid email profile',
        params,
      ),

    async exchange(code, verifier, redirectUri) {
      const body = await getJson<{ access_token?: string }>(
        'https://oauth2.googleapis.com/token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            code_verifier: verifier,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }).toString(),
        },
      );
      if (!body.access_token) throw new AuthFlowError('provider_error');
      return body.access_token;
    },

    async profile(token) {
      const user = await getJson<{
        sub: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
        picture?: string;
      }>('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!user.email || user.email_verified !== true) {
        throw new AuthFlowError('email_unverified');
      }
      return {
        providerId: user.sub,
        email: user.email,
        displayName: user.name || user.email,
        avatarUrl: user.picture,
      };
    },
  };
}

export function buildProviders(
  config: AuthConfig,
): Record<AuthProvider, OAuthProvider> {
  return { github: github(config.github), google: google(config.google) };
}
