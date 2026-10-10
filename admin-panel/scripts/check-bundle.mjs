import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadEnv } from 'vite';

/*
 * Nothing that names `gateway`, `api`, or a credential may reach the bundle.
 *
 * The app is a plain client that calls `/api/*` on its own origin (D0). The
 * admin host forwards those calls (FR-EDGE-9), so `gateway`'s address is the
 * admin host's to know, and `api`'s address and the API key are `gateway`'s.
 * That is kept by two conventions — no variable is VITE_-prefixed, and nothing
 * under src/ mentions them — and both are conventions a future edit could
 * break silently. This check turns the convention into a build failure.
 *
 * Run after every `vite build`. It reads the same env files the dev server
 * does, and `gateway`'s where there is one, so it checks the values that are
 * actually configured on this machine, not placeholders.
 */

/* Resolved from the working directory, not from this file's location: `npm
   run build` runs with the package root as cwd, and taking it from there is
   what lets the guard be pointed at a fixture directory and proved to fail. */
const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');

/** Header names that must never appear, in any case, whatever the environment
 *  holds. Each is as good as a confession: `gateway` sets both on every
 *  request to `api` (FR-EDGE-4) and the browser never does, so its presence
 *  means transport code learned about something it must not know. */
const FORBIDDEN_LITERALS = ['X-Api-Key', 'X-User-Id'];

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/* Text-ish assets only. Fonts and images cannot carry a secret that got there
   by compilation, and reading them wastes the check's time. */
const TEXTUAL = /\.(js|mjs|cjs|css|html|json|map|txt|svg)$/i;

const env = loadEnv('production', ROOT, '');
/* `gateway` sits beside this package, and only it knows where `api` is. */
const gatewayEnv = loadEnv('production', join(ROOT, '..', 'gateway'), '');
const hostOf = (origin = '') =>
  URL.canParse(origin.trim()) ? new URL(origin.trim()).host : '';

/** Values that must not appear, each with the name it is reported under. */
const values = [
  ["gateway's address", hostOf(env.GATEWAY_ORIGIN)],
  ["api's address", hostOf(gatewayEnv.API_UPSTREAM)],
  ['GATEWAY_API_KEY', gatewayEnv.GATEWAY_API_KEY],
]
  .map(([name, value]) => [name, (value ?? '').trim().toLowerCase()])
  /* A short value would produce false positives against minified output. */
  .filter(([, value]) => value.length >= 8);

const files = walk(DIST).filter((file) => TEXTUAL.test(file));

if (files.length === 0) {
  console.error('check-bundle: no build output found in dist/. Build first.');
  process.exit(1);
}

const hits = [];
for (const file of files) {
  const contents = readFileSync(file, 'utf8').toLowerCase();
  for (const literal of FORBIDDEN_LITERALS) {
    if (contents.includes(literal.toLowerCase())) {
      hits.push(`  ${relative(ROOT, file)} contains the string "${literal}"`);
    }
  }
  /* Named, never reprinted. */
  for (const [name, value] of values) {
    if (contents.includes(value)) {
      hits.push(`  ${relative(ROOT, file)} contains the value of ${name}`);
    }
  }
}

if (hits.length > 0) {
  console.error(
    'check-bundle: the build leaked values the client must not hold.\n' +
      `${hits.join('\n')}\n\n` +
      'The app calls /api/* on its own origin and nothing else. Something\n' +
      'under src/ now references these, or a VITE_-prefixed alias was added.\n' +
      'Neither may ship.',
  );
  process.exit(1);
}

console.log(
  `check-bundle: ${String(files.length)} files, nothing leaked. ` +
    `Checked ${String(FORBIDDEN_LITERALS.length + values.length)} patterns.`,
);
