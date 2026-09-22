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
const KEY = 'a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5';
const USER_ID = '5eed00000000000001040001';

const made: string[] = [];

function sandbox(files: Record<string, string>, env: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'bundle-guard-'));
  made.push(root);
  mkdirSync(join(root, 'dist', 'assets'), { recursive: true });
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(root, 'dist', name), contents);
  }
  /* The script reads its env the way the dev server does, from files in the
     directory it is pointed at. */
  writeFileSync(
    join(root, '.env.local'),
    Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n'),
  );
  return root;
}

/** Runs the guard against a sandbox. Returns null on success, else stderr. */
function run(root: string): string | null {
  /* Deleted rather than blanked: `loadEnv` with an empty prefix merges
     process.env over the .env files, so an empty string here would shadow the
     sandbox's value and the guard would find nothing to complain about. */
  const env = { ...process.env };
  delete env.ADMIN_API_KEY;
  delete env.DEV_USER_ID;

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
  test('fails on a bundle carrying the admin key', () => {
    const root = sandbox(
      { 'assets/index-abc.js': `const k="${KEY}";export default k;` },
      { ADMIN_API_KEY: KEY },
    );
    const output = run(root);
    expect(output).not.toBeNull();
    expect(output).toContain('leaked');
    /* And it does not reprint the secret while complaining about it. */
    expect(output).not.toContain(KEY);
  }, SPAWN_TIMEOUT);

  test('fails on the header name alone, with no key configured', () => {
    /* The name is as good as a confession: nothing in the bundle has any
       reason to know it. */
    const root = sandbox(
      { 'assets/index-abc.js': `fetch(u,{headers:{"X-Api-Key":k}})` },
      {},
    );
    expect(run(root)).toContain('X-Api-Key');
  }, SPAWN_TIMEOUT);

  test('fails on a leaked DEV_USER_ID', () => {
    const root = sandbox(
      { 'assets/index-abc.js': `const tenant="${USER_ID}";` },
      { DEV_USER_ID: USER_ID },
    );
    expect(run(root)).not.toBeNull();
  }, SPAWN_TIMEOUT);

  test('passes a clean bundle', () => {
    const root = sandbox(
      {
        'assets/index-abc.js': 'export const app=()=>fetch("/api/admin/me");',
        'index.html': '<!doctype html><div id="root"></div>',
      },
      { ADMIN_API_KEY: KEY },
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

  test('ignores a key too short to be meaningful', () => {
    /* A three-character key would match minified output everywhere, and is
       not protecting anything either. */
    const root = sandbox(
      { 'assets/index-abc.js': 'const a="abc";' },
      { ADMIN_API_KEY: 'abc' },
    );
    expect(run(root)).toBeNull();
  }, SPAWN_TIMEOUT);
});
