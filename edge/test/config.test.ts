import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { makeAdminDist } from './helpers.js';

let adminDist: string;
let env: NodeJS.ProcessEnv;

beforeAll(() => {
  adminDist = makeAdminDist();
  writeFileSync(join(adminDist, 'cert.pem'), 'cert');
  writeFileSync(join(adminDist, 'key.pem'), 'key');
  env = {
    ADMIN_HOST: 'Admin.Openfolio.Test',
    PUBLIC_READ_HOST: 'api.openfolio.test',
    API_UPSTREAM: 'http://127.0.0.1:3001/',
    ADMIN_DIST_DIR: adminDist,
    PORT: '8443',
    RATE_LIMIT_OAUTH_MAX: '10',
    RATE_LIMIT_OAUTH_WINDOW_MS: '60000',
    RATE_LIMIT_AUTH_MAX: '60',
    RATE_LIMIT_AUTH_WINDOW_MS: '60000',
    RATE_LIMIT_PUBLIC_MAX: '600',
    RATE_LIMIT_PUBLIC_WINDOW_MS: '60000',
  };
});

afterAll(() => rmSync(adminDist, { recursive: true, force: true }));

describe('loadConfig (FR-EDGE-6)', () => {
  it('accepts a complete environment', () => {
    expect(loadConfig(env)).toEqual({
      adminHost: 'admin.openfolio.test',
      publicReadHost: 'api.openfolio.test',
      apiUpstream: 'http://127.0.0.1:3001',
      adminDistDir: adminDist,
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
      TLS_CERT_PATH: join(adminDist, 'cert.pem'),
      TLS_KEY_PATH: join(adminDist, 'key.pem'),
    });
    expect(config.tls?.cert.toString()).toBe('cert');
    expect(config.tls?.key.toString()).toBe('key');
  });

  it('reads the trusted proxies (Q24)', () => {
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

  it('names every missing variable at once', () => {
    expect(() => loadConfig({})).toThrowError(
      /ADMIN_HOST is required[^]*PUBLIC_READ_HOST is required[^]*API_UPSTREAM is required[^]*ADMIN_DIST_DIR is required[^]*PORT is required[^]*RATE_LIMIT_OAUTH_MAX is required[^]*RATE_LIMIT_PUBLIC_WINDOW_MS is required/,
    );
  });

  it.each([
    [{ ADMIN_HOST: 'https://admin.openfolio.test' }, /ADMIN_HOST must be a bare hostname/],
    [{ PUBLIC_READ_HOST: 'api.openfolio.test:443' }, /PUBLIC_READ_HOST must be a bare hostname/],
    [{ PUBLIC_READ_HOST: 'admin.openfolio.test' }, /must differ/],
    [{ API_UPSTREAM: '127.0.0.1:3001' }, /API_UPSTREAM must be/],
    [{ API_UPSTREAM: 'http://127.0.0.1:3001/api' }, /API_UPSTREAM must be/],
    [{ ADMIN_DIST_DIR: join('no', 'such', 'dir') }, /no index\.html/],
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

  it('rejects trusted proxies alongside in-process TLS (Q24)', () => {
    expect(() =>
      loadConfig({
        ...env,
        TLS_CERT_PATH: join(adminDist, 'cert.pem'),
        TLS_KEY_PATH: join(adminDist, 'key.pem'),
        TRUSTED_PROXY_CIDRS: '10.0.0.0/8',
      }),
    ).toThrowError(/TRUSTED_PROXY_CIDRS must be empty/);
  });
});
