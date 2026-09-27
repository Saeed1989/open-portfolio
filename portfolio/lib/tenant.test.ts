import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSlugFromHost } from './tenant.ts';

beforeEach(() => {
  process.env.PORTFOLIO_BASE_DOMAIN = 'openfolio.site';
});

test('valid slug', () => {
  assert.equal(resolveSlugFromHost('alice.openfolio.site'), 'alice');
  assert.equal(resolveSlugFromHost('alice-2.openfolio.site'), 'alice-2');
});

test('uppercase host', () => {
  assert.equal(resolveSlugFromHost('ALICE.OpenFolio.Site'), 'alice');
});

test('host with port', () => {
  assert.equal(resolveSlugFromHost('alice.openfolio.site:3000'), 'alice');
});

test('apex', () => {
  assert.equal(resolveSlugFromHost('openfolio.site'), null);
  assert.equal(resolveSlugFromHost('openfolio.site:443'), null);
});

test('reserved labels', () => {
  for (const label of ['www', 'admin', 'api']) {
    assert.equal(resolveSlugFromHost(`${label}.openfolio.site`), null);
  }
});

test('nested subdomain', () => {
  assert.equal(resolveSlugFromHost('a.alice.openfolio.site'), null);
});

test('wrong base domain', () => {
  assert.equal(resolveSlugFromHost('alice.evil.com'), null);
  assert.equal(resolveSlugFromHost('alice.openfolio.site.evil.com'), null);
  assert.equal(resolveSlugFromHost('aliceopenfolio.site'), null);
});

test('empty or null', () => {
  assert.equal(resolveSlugFromHost(null), null);
  assert.equal(resolveSlugFromHost(''), null);
  assert.equal(resolveSlugFromHost('.openfolio.site'), null);
});

test('invalid characters', () => {
  assert.equal(resolveSlugFromHost('al_ice.openfolio.site'), null);
  assert.equal(resolveSlugFromHost('-alice.openfolio.site'), null);
  assert.equal(resolveSlugFromHost('alice-.openfolio.site'), null);
  assert.equal(resolveSlugFromHost('al%69ce.openfolio.site'), null);
});

test('base domain from env', () => {
  process.env.PORTFOLIO_BASE_DOMAIN = 'localhost';
  assert.equal(resolveSlugFromHost('alice.localhost:3000'), 'alice');
  assert.equal(resolveSlugFromHost('alice.openfolio.site'), null);
});
