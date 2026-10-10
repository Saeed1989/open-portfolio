// @ts-check
import { defineConfig } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

/*
 * public, admin and auth are separate surfaces in one process (SRS §2.1) and
 * may not import each other's internals — one zone per surface. common,
 * external and @portfolio/registry are shared.
 *
 * Auth has one declared way in (FR-AUTH-17): `account-access.ts`, the
 * interface, and `auth.module.ts`, which provides it. Nothing else under
 * src/auth is importable from another surface, so no other surface can
 * register a model for `users` or `sessions`. The shared trees may not reach
 * into auth at all.
 */
const authEntrypoints = ['./account-access.ts', './auth.module.ts'];

const zones = [
  { target: './src/public', from: './src/admin' },
  { target: './src/public', from: './src/auth', except: authEntrypoints },
  { target: './src/admin', from: './src/public' },
  { target: './src/admin', from: './src/auth', except: authEntrypoints },
  { target: './src/auth', from: './src/public' },
  { target: './src/auth', from: './src/admin' },
  {
    target: [
      './src/schemas',
      './src/common',
      './src/external',
      './src/transport',
    ],
    from: './src/auth',
  },
].map((zone) => ({
  ...zone,
  message: 'Surfaces may not import each other’s internals (SRS §2.1).',
}));

export default defineConfig(
  { ignores: ['dist/', 'openapi/'] },
  tseslint.configs.recommended,
  {
    rules: {
      /* Handler parameters exist for their decorators — routing, validation,
         Swagger — whether or not the body reads them yet. */
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
    },
  },
  {
    files: ['src/**/*.ts'],
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': { node: { extensions: ['.ts'] } },
    },
    rules: {
      'import/no-restricted-paths': ['error', { zones }],
    },
  },
);
