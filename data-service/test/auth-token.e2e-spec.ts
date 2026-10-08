import { randomBytes } from 'node:crypto';
import { decodeJwt, decodeProtectedHeader, SignJWT } from 'jose';
import { AccessTokenService } from '../src/auth/access-token.service';
import { loadAuthConfig } from '../src/auth/auth.config';

/*
 * The access JWT (FR-AUTH-11, FR-AUTH-19) and the boot-time key rules.
 * No app and no database: tokens are minted through the token service with
 * test keys.
 */

const USER = '5eed00000000000001010001';
const key = () => randomBytes(32);
const KEYS = { current: key(), previous: key() };

const env =
  (overrides: Record<string, string | undefined> = {}) =>
  (name: string) =>
    ({
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: 'client-secret',
      GOOGLE_REDIRECT_URI:
        'https://admin.openfolio.test/api/auth/google/callback',
      AUTH_JWT_KEYS: JSON.stringify({
        current: KEYS.current.toString('base64url'),
        previous: KEYS.previous.toString('base64url'),
      }),
      AUTH_JWT_CURRENT_KID: 'current',
      ...overrides,
    })[name];

const service = new AccessTokenService(loadAuthConfig(env()));
const now = () => Math.floor(Date.now() / 1000);

const b64 = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

describe('access JWT', () => {
  it('is HS256, names the current kid, and carries sub, iat and a 900 s exp', async () => {
    const token = await service.sign(USER);

    expect(decodeProtectedHeader(token)).toEqual({
      alg: 'HS256',
      kid: 'current',
    });
    const claims = decodeJwt(token);
    expect(Object.keys(claims).sort()).toEqual(['exp', 'iat', 'sub']);
    expect(claims.sub).toBe(USER);
    expect(claims.exp! - claims.iat!).toBe(900);

    expect(await service.verify(token)).toBe(USER);
  });

  it('rejects alg none', async () => {
    const unsigned = `${b64({ alg: 'none', kid: 'current' })}.${b64({
      sub: USER,
      iat: now(),
      exp: now() + 900,
    })}.`;
    expect(await service.verify(unsigned)).toBeNull();
  });

  it('rejects another HMAC algorithm under a known key', async () => {
    const token = await new SignJWT()
      .setProtectedHeader({ alg: 'HS512', kid: 'current' })
      .setSubject(USER)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(Buffer.concat([KEYS.current, KEYS.current]));
    expect(await service.verify(token)).toBeNull();
  });

  it('rejects an unknown kid', async () => {
    const stranger = new AccessTokenService(
      loadAuthConfig(
        env({
          AUTH_JWT_KEYS: JSON.stringify({
            stranger: key().toString('base64url'),
          }),
          AUTH_JWT_CURRENT_KID: 'stranger',
        }),
      ),
    );
    expect(await service.verify(await stranger.sign(USER))).toBeNull();
  });

  it('rejects a token with no kid', async () => {
    const token = await new SignJWT()
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(USER)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(KEYS.current);
    expect(await service.verify(token)).toBeNull();
  });

  it('accepts the previous kid', async () => {
    const beforeRotation = new AccessTokenService(
      loadAuthConfig(env({ AUTH_JWT_CURRENT_KID: 'previous' })),
    );
    const token = await beforeRotation.sign(USER);
    expect(decodeProtectedHeader(token).kid).toBe('previous');
    expect(await service.verify(token)).toBe(USER);
  });

  it('rejects an expired token', async () => {
    const token = await new SignJWT()
      .setProtectedHeader({ alg: 'HS256', kid: 'current' })
      .setSubject(USER)
      .setIssuedAt(now() - 1000)
      .setExpirationTime(now() - 100)
      .sign(KEYS.current);
    expect(await service.verify(token)).toBeNull();
  });

  it('rejects a tampered signature', async () => {
    const [header, payload, signature] = (await service.sign(USER)).split('.');
    const flipped = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1);
    expect(await service.verify(`${header}.${payload}.${flipped}`)).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const [header, , signature] = (await service.sign(USER)).split('.');
    const forged = b64({
      sub: '5eed00000000000001020001',
      iat: now(),
      exp: now() + 900,
    });
    expect(await service.verify(`${header}.${forged}.${signature}`)).toBeNull();
  });

  it.each([undefined, '', 'not-a-jwt'])('rejects %j', async (token) => {
    expect(await service.verify(token)).toBeNull();
  });
});

describe('auth environment (FR-AUTH-19): boot is refused when', () => {
  const k = () => key().toString('base64url');

  it.each([
    ['a Google variable is missing', { GOOGLE_CLIENT_SECRET: undefined }],
    ['the redirect URI is not a URL', { GOOGLE_REDIRECT_URI: 'callback' }],
    ['AUTH_JWT_KEYS is missing', { AUTH_JWT_KEYS: undefined }],
    ['AUTH_JWT_KEYS is not JSON', { AUTH_JWT_KEYS: 'current=abc' }],
    ['AUTH_JWT_KEYS is not an object', { AUTH_JWT_KEYS: '["a"]' }],
    ['AUTH_JWT_KEYS is empty', { AUTH_JWT_KEYS: '{}' }],
    [
      'AUTH_JWT_KEYS holds three keys',
      { AUTH_JWT_KEYS: JSON.stringify({ current: k(), b: k(), c: k() }) },
    ],
    [
      'a key is shorter than 256 bits',
      {
        AUTH_JWT_KEYS: JSON.stringify({
          current: randomBytes(31).toString('base64url'),
        }),
      },
    ],
    [
      'a key is not base64url',
      { AUTH_JWT_KEYS: JSON.stringify({ current: `${k()}+/=` }) },
    ],
    ['the current kid is missing', { AUTH_JWT_CURRENT_KID: undefined }],
    ['the current kid names no key', { AUTH_JWT_CURRENT_KID: 'other' }],
  ])('%s', (_label, overrides) => {
    expect(() => loadAuthConfig(env(overrides))).toThrow();
  });

  it('and accepts one key or two', () => {
    expect(loadAuthConfig(env()).jwtKeys.size).toBe(2);
    expect(
      loadAuthConfig(env({ AUTH_JWT_KEYS: JSON.stringify({ current: k() }) }))
        .jwtKeys.size,
    ).toBe(1);
  });
});
