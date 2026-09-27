import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadEnv } from 'vite';

/*
 * Nothing secret may reach the bundle.
 *
 * Direct mode's safety argument is that identity and the dev key are injected
 * by the dev-server proxy and are never available to client code. That is
 * enforced by two things — the variables are not VITE_-prefixed, and nothing
 * under src/ mentions them — and both are conventions a future edit could
 * break silently. This check turns the convention into a build failure.
 *
 * Run after every `vite build`. It reads the same env files the dev server
 * does, so it checks the value that is actually configured on this machine,
 * not a placeholder.
 */

/* Resolved from the working directory, not from this file's location: `npm
   run build` runs with the package root as cwd, and taking it from there is
   what lets the guard be pointed at a fixture directory and proved to fail. */
const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');

/** Strings that must never appear, whatever the environment holds. */
const FORBIDDEN_LITERALS = [
  /* The header name is as good as a confession: nothing in the bundle has any
     reason to know it. `edge` sets X-Api-Key in production and the dev proxy
     sets it in direct mode; either way the browser never does, so its presence
     means transport code learned about something it must not know. */
  'X-Api-Key',
  'ADMIN_API_KEY',
];

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
const apiKey = (env.ADMIN_API_KEY ?? '').trim();
const devUserId = (env.DEV_USER_ID ?? '').trim();

const needles = [...FORBIDDEN_LITERALS];
/* A short key would produce false positives against minified output, and a
   key that short is not protecting anything either. */
if (apiKey.length >= 8) needles.push(apiKey);
if (devUserId.length >= 8) needles.push(devUserId);

const files = walk(DIST).filter((file) => TEXTUAL.test(file));

if (files.length === 0) {
  console.error('check-bundle: no build output found in dist/. Build first.');
  process.exit(1);
}

const hits = [];
for (const file of files) {
  const contents = readFileSync(file, 'utf8');
  for (const needle of needles) {
    if (!contents.includes(needle)) continue;
    const redacted =
      needle === apiKey
        ? 'the value of ADMIN_API_KEY'
        : needle === devUserId
          ? 'the value of DEV_USER_ID'
          : `the string "${needle}"`;
    hits.push(`  ${relative(ROOT, file)} contains ${redacted}`);
  }
}

if (hits.length > 0) {
  console.error(
    'check-bundle: the build leaked development-only values.\n' +
      `${hits.join('\n')}\n\n` +
      'Direct mode injects identity and the dev key in the Vite proxy, never\n' +
      'in client code. Something under src/ now references them, or a\n' +
      'VITE_-prefixed alias was added. Neither may ship.',
  );
  process.exit(1);
}

console.log(
  `check-bundle: ${String(files.length)} files, no development-only values. ` +
    `Checked ${String(needles.length)} patterns.`,
);
