import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const KEY = randomBytes(32).toString('base64url');

let certs: string;
let env: NodeJS.ProcessEnv;

beforeAll(() => {
  certs = mkdtempSync(join(tmpdir(), 'gateway-certs-'));
  writeFileSync(join(certs, 'cert.pem'), 'cert');
  writeFileSync(join(certs, 'key.pem'), 'key');
  env = {
    GATEWAY_ADMIN_HOST: 'Gateway.Openfolio.Test',
    PUBLIC_READ_HOST: 'api.openfolio.test',
    API_UPSTREAM: 'http://127.0.0.1:3001/',
    GATEWAY_API_KEY: KEY,
    PORT: '8443',
    RATE_LIMIT_OAUTH_MAX: '10',
    RATE_LIMIT_OAUTH_WINDOW_MS: '60000',
    RATE_LIMIT_AUTH_MAX: '60',
    RATE_LIMIT_AUTH_WINDOW_MS: '60000',
    RATE_LIMIT_PUBLIC_MAX: '600',
    RATE_LIMIT_PUBLIC_WINDOW_MS: '60000',
  };
});

afterAll(() => rmSync(certs, { recursive: true, force: true }));

describe('loadConfig (FR-EDGE-6)', () => {
  it('accepts a complete environment', () => {
    expect(loadConfig(env)).toEqual({
      adminRouteHost: 'gateway.openfolio.test',
      publicReadHost: 'api.openfolio.test',
      apiUpstream: 'http://127.0.0.1:3001',
      apiKey: KEY,
      port: 8443,
      tls: null,
      trustedProxyCidrs: [],
      rateLimits: {
        oauth: { max: 10, windowMs: 60000 },
        auth: { max: 60, windowMs: 60000 },
        publicRead: { max: 600, windowMs: 60000 },
      },
    });
  });

  it('reads TLS material when both paths are set (Q24)', () => {
    const config = loadConfig({
      ...env,
      TLS_CERT_PATH: join(certs, 'cert.pem'),
      TLS_KEY_PATH: join(certs, 'key.pem'),
    });
    expect(config.tls?.cert.toString()).toBe('cert');
    expect(config.tls?.key.toString()).toBe('key');
  });

  it('reads the trusted proxies (FR-EDGE-10)', () => {
    const config = loadConfig({
      ...env,
      TRUSTED_PROXY_CIDRS: '10.0.0.0/8, 192.168.1.4 ,fd00::/8',
    });
    expect(config.trustedProxyCidrs).toEqual([
      '10.0.0.0/8',
      '192.168.1.4',
      'fd00::/8',
    ]);
  });

  it('accepts trusted proxies alongside in-process TLS: the admin host connects over TLS (FR-EDGE-9, FR-EDGE-10)', () => {
    const config = loadConfig({
      ...env,
      TLS_CERT_PATH: join(certs, 'cert.pem'),
      TLS_KEY_PATH: join(certs, 'key.pem'),
      TRUSTED_PROXY_CIDRS: '10.0.0.0/8',
    });
    expect(config.tls).not.toBeNull();
    expect(config.trustedProxyCidrs).toEqual(['10.0.0.0/8']);
  });

  it('names every missing variable at once', () => {
    expect(() => loadConfig({})).toThrowError(
      /GATEWAY_ADMIN_HOST is required[^]*PUBLIC_READ_HOST is required[^]*API_UPSTREAM is required[^]*GATEWAY_API_KEY is required[^]*PORT is required[^]*RATE_LIMIT_OAUTH_MAX is required[^]*RATE_LIMIT_PUBLIC_WINDOW_MS is required/,
    );
  });

  it('no longer takes the admin build or the admin host', () => {
    expect(() =>
      loadConfig({
        ...env,
        GATEWAY_ADMIN_HOST: undefined,
        ADMIN_HOST: 'admin.openfolio.test',
        ADMIN_DIST_DIR: certs,
      }),
    ).toThrowError(/GATEWAY_ADMIN_HOST is required/);
  });

  it.each([
    [{ GATEWAY_ADMIN_HOST: 'https://gateway.openfolio.test' }, /GATEWAY_ADMIN_HOST must be a bare hostname/],
    [{ PUBLIC_READ_HOST: 'api.openfolio.test:443' }, /PUBLIC_READ_HOST must be a bare hostname/],
    [{ PUBLIC_READ_HOST: 'gateway.openfolio.test' }, /must differ/],
    [{ API_UPSTREAM: '127.0.0.1:3001' }, /API_UPSTREAM must be/],
    [{ API_UPSTREAM: 'http://127.0.0.1:3001/api' }, /API_UPSTREAM must be/],
    [{ GATEWAY_API_KEY: randomBytes(31).toString('base64url') }, /GATEWAY_API_KEY must be base64url of at least 256 bits/],
    [{ GATEWAY_API_KEY: KEY + '+/=' }, /GATEWAY_API_KEY must be base64url/],
    [{ PORT: '0' }, /PORT must be an integer/],
    [{ PORT: '8443x' }, /PORT must be an integer/],
    [{ RATE_LIMIT_AUTH_MAX: '0' }, /RATE_LIMIT_AUTH_MAX must be an integer/],
    [{ RATE_LIMIT_PUBLIC_WINDOW_MS: '1m' }, /RATE_LIMIT_PUBLIC_WINDOW_MS must be an integer/],
    [{ TLS_CERT_PATH: 'cert.pem' }, /must be set together/],
    [{ TLS_KEY_PATH: 'key.pem' }, /must be set together/],
    [{ TLS_CERT_PATH: 'missing.pem', TLS_KEY_PATH: 'missing.pem' }, /TLS material is unreadable/],
    [{ TRUSTED_PROXY_CIDRS: '10.0.0.0/33' }, /not an address or CIDR/],
    [{ TRUSTED_PROXY_CIDRS: 'loadbalancer' }, /not an address or CIDR/],
  ])('rejects %j', (override, message) => {
    expect(() => loadConfig({ ...env, ...override })).toThrowError(message);
  });
});
