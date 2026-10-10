import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

/*
 * The build guard, proved against a bundle that really does leak.
 *
 * A check that has never failed is a check nobody has reason to trust, so
 * each case below writes a `dist/` with a known leak and asserts the script
 * exits non-zero — and the clean case asserts it does not, which is the half
 * that stops it from being a script that always fails.
 *
 * The script is run as a child process rather than imported, because exiting
 * non-zero is the behaviour under test.
 */

const SCRIPT = join(process.cwd(), 'scripts', 'check-bundle.mjs');
const KEY = 'a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5a6b7c8d9e0f';
const GATEWAY_ORIGIN = 'http://gateway.localhost:8080';
const API_UPSTREAM = 'http://10.20.30.40:3001';

const made: string[] = [];

const dotenv = (env: Record<string, string>) =>
  Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

/** A package directory with a `dist/` and its own `.env.local`, and
 *  `gateway`'s `.env` beside it: the script reads its env the way the dev
 *  server does, from files in the directory it is pointed at, and `gateway`'s
 *  from the directory next door. */
function sandbox(
  files: Record<string, string>,
  env: Record<string, string>,
  gatewayEnv: Record<string, string> = {},
) {
  const parent = mkdtempSync(join(tmpdir(), 'bundle-guard-'));
  made.push(parent);
  const root = join(parent, 'admin-panel');
  mkdirSync(join(root, 'dist', 'assets'), { recursive: true });
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(root, 'dist', name), contents);
  }
  writeFileSync(join(root, '.env.local'), dotenv(env));
  mkdirSync(join(parent, 'gateway'));
  writeFileSync(join(parent, 'gateway', '.env'), dotenv(gatewayEnv));
  return root;
}

/** Runs the guard against a sandbox. Returns null on success, else stderr. */
function run(root: string): string | null {
  /* Deleted rather than blanked: `loadEnv` with an empty prefix merges
     process.env over the .env files, so an empty string here would shadow the
     sandbox's value and the guard would find nothing to complain about. */
  const env = { ...process.env };
  delete env.GATEWAY_ORIGIN;
  delete env.API_UPSTREAM;
  delete env.GATEWAY_API_KEY;

  try {
    execFileSync(process.execPath, [SCRIPT], {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return null;
  } catch (error) {
    const failure = error as { stderr?: Buffer; stdout?: Buffer };
    return String(failure.stderr ?? '') + String(failure.stdout ?? '');
  }
}

afterEach(() => {
  for (const dir of made.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* Each case spawns a node child that imports vite, which costs a few seconds
   on its own — comfortably past vitest's 5s default once the machine is busy.
   The budget is explicit rather than left to how loaded the box happens to be. */
const SPAWN_TIMEOUT = 30_000;

describe('check-bundle', () => {
  test("fails on a bundle carrying gateway's address", () => {
    const root = sandbox(
      { 'assets/index-abc.js': `fetch("${GATEWAY_ORIGIN}/api/admin/me")` },
      { GATEWAY_ORIGIN },
    );
    expect(run(root)).toContain("the value of gateway's address");
  }, SPAWN_TIMEOUT);

  test("fails on a bundle carrying api's address", () => {
    const root = sandbox(
      { 'assets/index-abc.js': `fetch("${API_UPSTREAM}/admin/me")` },
      {},
      { API_UPSTREAM },
    );
    expect(run(root)).toContain("the value of api's address");
  }, SPAWN_TIMEOUT);

  test('fails on a bundle carrying the API key, without reprinting it', () => {
    const root = sandbox(
      { 'assets/index-abc.js': `const k="${KEY}";export default k;` },
      {},
      { GATEWAY_API_KEY: KEY },
    );
    const output = run(root);
    expect(output).toContain('leaked');
    /* And it does not reprint the secret while complaining about it. */
    expect(output).not.toContain(KEY);
  }, SPAWN_TIMEOUT);

  test.each(['X-Api-Key', 'x-user-id'])(
    'fails on the header name %s alone, with nothing configured',
    (header) => {
      /* The name is as good as a confession: nothing in the bundle has any
         reason to know it. */
      const root = sandbox(
        { 'assets/index-abc.js': `fetch(u,{headers:{"${header}":k}})` },
        {},
      );
      expect(run(root)).toContain('leaked');
    },
    SPAWN_TIMEOUT,
  );

  test('passes a clean bundle', () => {
    const root = sandbox(
      {
        'assets/index-abc.js': 'export const app=()=>fetch("/api/admin/me");',
        'index.html': '<!doctype html><div id="root"></div>',
      },
      { GATEWAY_ORIGIN },
      { API_UPSTREAM, GATEWAY_API_KEY: KEY },
    );
    expect(run(root)).toBeNull();
  }, SPAWN_TIMEOUT);

  test('fails when there is no build output to check', () => {
    /* Otherwise a build that emitted nothing would pass silently, which is
       the one failure mode a guard must not have. */
    const root = mkdtempSync(join(tmpdir(), 'bundle-guard-empty-'));
    made.push(root);
    expect(run(root)).toContain('no build output');
  }, SPAWN_TIMEOUT);

  test('ignores a value too short to be meaningful', () => {
    /* A three-character hostname would match minified output everywhere. */
    const root = sandbox(
      { 'assets/index-abc.js': 'const a="abc";' },
      { GATEWAY_ORIGIN: 'http://abc' },
    );
    expect(run(root)).toBeNull();
  }, SPAWN_TIMEOUT);
});
