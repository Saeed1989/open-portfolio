import type { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');

export interface SigningKey {
  readonly kid: string;
  readonly key: Buffer;
}

export interface AuthConfig {
  /** e.g. `https://admin.openfolio.site`, no trailing slash. */
  readonly adminOrigin: string;
  readonly github: { readonly clientId: string; readonly clientSecret: string };
  readonly google: { readonly clientId: string; readonly clientSecret: string };
  readonly accessJwt: {
    readonly current: SigningKey;
    readonly previous: SigningKey | null;
  };
  /** AES-256-GCM key for the provider token (NFR-SEC-3). */
  readonly tokenEncryptionKey: Buffer;
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Read once at boot. Anything missing or malformed throws while the module is
 * being built, so the process never starts serving with half an auth config.
 */
export const authConfigProvider: FactoryProvider<AuthConfig> = {
  provide: AUTH_CONFIG,
  inject: [ConfigService],
  useFactory: (config: ConfigService): AuthConfig => {
    const required = (name: string): string => {
      const value = config.get<string>(name);
      if (!value) throw new Error(`${name} is required`);
      return value;
    };

    const base64Key = (name: string, value: string): Buffer => {
      if (!BASE64.test(value) || value.length % 4 !== 0) {
        throw new Error(`${name} must be base64`);
      }
      return Buffer.from(value, 'base64');
    };

    /* RFC 7518 §3.2: an HS256 key is at least as long as the hash (FR-AUTH-19). */
    const signingKey = (kidName: string, keyName: string): SigningKey => {
      const key = base64Key(keyName, required(keyName));
      if (key.length < 32) {
        throw new Error(`${keyName} must decode to at least 32 bytes`);
      }
      return { kid: required(kidName), key };
    };

    const adminOrigin = required('ADMIN_ORIGIN');
    let parsed: URL;
    try {
      parsed = new URL(adminOrigin);
    } catch {
      throw new Error('ADMIN_ORIGIN must be an absolute URL');
    }
    if (parsed.origin !== adminOrigin) {
      throw new Error('ADMIN_ORIGIN must be an origin, with no path');
    }

    const current = signingKey(
      'ACCESS_JWT_CURRENT_KID',
      'ACCESS_JWT_CURRENT_KEY',
    );
    const hasPrevious =
      !!config.get('ACCESS_JWT_PREVIOUS_KID') ||
      !!config.get('ACCESS_JWT_PREVIOUS_KEY');
    const previous = hasPrevious
      ? signingKey('ACCESS_JWT_PREVIOUS_KID', 'ACCESS_JWT_PREVIOUS_KEY')
      : null;
    if (previous?.kid === current.kid) {
      throw new Error('ACCESS_JWT_PREVIOUS_KID must differ from the current');
    }

    const tokenEncryptionKey = base64Key(
      'TOKEN_ENCRYPTION_KEY',
      required('TOKEN_ENCRYPTION_KEY'),
    );
    if (tokenEncryptionKey.length !== 32) {
      throw new Error('TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes');
    }

    return {
      adminOrigin,
      github: {
        clientId: required('GITHUB_CLIENT_ID'),
        clientSecret: required('GITHUB_CLIENT_SECRET'),
      },
      google: {
        clientId: required('GOOGLE_CLIENT_ID'),
        clientSecret: required('GOOGLE_CLIENT_SECRET'),
      },
      accessJwt: { current, previous },
      tokenEncryptionKey,
    };
  },
};
