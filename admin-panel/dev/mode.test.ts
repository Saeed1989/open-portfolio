import { describe, expect, test } from 'vitest';
import { describeDevMode, DevModeConfigError, resolveDevMode } from './mode';
import { DEV_TENANTS, resolveDevTenant } from './tenants';

/*
 * The dev server's startup decisions.
 *
 * These matter more than most config tests, because two of them are the whole
 * of direct mode's safety: the tenant is resolved once, here, from the
 * environment — and a misconfiguration stops the server rather than producing
 * one that 401s on every request and looks like an app bug.
 */

describe('mode selection', () => {
  test('defaults to mock, so a fresh clone works offline', () => {
    expect(resolveDevMode({}).mode).toBe('mock');
    expect(resolveDevMode({ ADMIN_DEV_MODE: '  ' }).mode).toBe('mock');
  });

  test('mock and edge need nothing else configured', () => {
    expect(resolveDevMode({ ADMIN_DEV_MODE: 'mock' }).mode).toBe('mock');
    expect(resolveDevMode({ ADMIN_DEV_MODE: 'edge' }).mode).toBe('edge');
  });

  test('an unknown mode is refused by name', () => {
    expect(() => resolveDevMode({ ADMIN_DEV_MODE: 'proxy' })).toThrow(/proxy/);
  });
});

describe('direct mode fails fast, naming what is missing', () => {
  const complete = {
    ADMIN_DEV_MODE: 'direct',
    API_URL: 'http://127.0.0.1:3000',
    ADMIN_API_KEY: 'an-admin-key',
    DEV_TENANT: 'alice',
  };

  test('accepts a complete configuration', () => {
    const config = resolveDevMode(complete);
    expect(config.mode).toBe('direct');
    if (config.mode !== 'direct') throw new Error('unreachable');
    expect(config.tenant.userId).toBe(DEV_TENANTS.alice);
    expect(config.apiUrl).toBe('http://127.0.0.1:3000');
  });

  test.each([
    ['API_URL', 'API_URL'],
    ['ADMIN_API_KEY', 'ADMIN_API_KEY'],
    ['DEV_TENANT', 'DEV_TENANT'],
  ])('a missing %s aborts and says so', (key, named) => {
    const env = { ...complete, [key]: '' };
    expect(() => resolveDevMode(env)).toThrow(DevModeConfigError);
    expect(() => resolveDevMode(env)).toThrow(new RegExp(named));
  });

  test('names every missing variable at once, not just the first', () => {
    expect(() => resolveDevMode({ ADMIN_DEV_MODE: 'direct' })).toThrow(
      /API_URL.*ADMIN_API_KEY.*DEV_TENANT/s,
    );
  });
});

describe('tenant resolution', () => {
  test('each seed name resolves to its deterministic id', () => {
    for (const [name, id] of Object.entries(DEV_TENANTS)) {
      expect(resolveDevTenant({ DEV_TENANT: name })?.userId).toBe(id);
    }
  });

  test('DEV_USER_ID overrides DEV_TENANT', () => {
    const custom = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    const resolved = resolveDevTenant({
      DEV_TENANT: 'alice',
      DEV_USER_ID: custom,
    });
    expect(resolved?.userId).toBe(custom);
    expect(resolved?.source).toBe('DEV_USER_ID');
  });

  test('an unknown tenant name is refused, with the valid ones listed', () => {
    expect(() => resolveDevTenant({ DEV_TENANT: 'erin' })).toThrow(
      /alice, bob, carol, dave/,
    );
  });

  test('a malformed DEV_USER_ID is refused here, not by a 401 later', () => {
    expect(() => resolveDevTenant({ DEV_USER_ID: 'alice' })).toThrow(
      /ObjectId/,
    );
  });

  test('no tenant configured is null rather than an error', () => {
    /* Only direct mode needs one; mock and edge must not be made to care. */
    expect(resolveDevTenant({})).toBeNull();
  });
});

describe('the startup banner', () => {
  test('names the tenant in direct mode, so it is never a guess', () => {
    const config = resolveDevMode({
      ADMIN_DEV_MODE: 'direct',
      API_URL: 'http://127.0.0.1:3000',
      ADMIN_API_KEY: 'an-admin-key',
      DEV_TENANT: 'dave',
    });
    const line = describeDevMode(config);
    expect(line).toContain('dave');
    expect(line).toContain(DEV_TENANTS.dave);
  });

  test('never prints the key', () => {
    const config = resolveDevMode({
      ADMIN_DEV_MODE: 'direct',
      API_URL: 'http://127.0.0.1:3000',
      ADMIN_API_KEY: 'super-secret-admin-key',
      DEV_TENANT: 'alice',
    });
    expect(describeDevMode(config)).not.toContain('super-secret-admin-key');
  });

  test('tells an edge-mode developer this port is not the one to open', () => {
    expect(describeDevMode({ mode: 'edge' })).toMatch(/edge/);
  });
});
