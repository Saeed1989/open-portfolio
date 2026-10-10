/**
 * Builds packages/registry and copies the built package into vendor/registry,
 * which package.json depends on. Keeps this app buildable from its own folder.
 *
 *   npm run vendor:registry && npm install
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(root, '../packages/registry');
const target = path.join(root, 'vendor', 'registry');

const run = (command) => execSync(command, { cwd: source, stdio: 'inherit' });

if (!existsSync(path.join(source, 'node_modules'))) run('npm ci');
run('npm run build');

rmSync(target, { recursive: true, force: true });
cpSync(path.join(source, 'dist'), path.join(target, 'dist'), { recursive: true });
cpSync(path.join(source, 'package.json'), path.join(target, 'package.json'));

console.log(`Copied @portfolio/registry to ${path.relative(root, target)}`);
