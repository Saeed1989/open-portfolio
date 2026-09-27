import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public/mockServiceWorker.js'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin,
    },
    settings: {
      /* `import/no-restricted-paths` compares resolved file paths, so an
         import it cannot resolve is silently allowed. The default node
         resolver does not know TypeScript extensions, which would make the
         zones below pass on everything — including the imports they exist to
         forbid. */
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      /*
       * §2.1's separation, applied from this side. `admin` is one of three
       * consumers of the registry and may not reach into another deployable:
       * `api`'s DTOs are its own (FR-API-1 and §2.1 — no DTO is shared between
       * surfaces), and `portfolio`'s components render the public page.
       *
       * The registry is reachable, but only as the published library §2.1
       * describes — its declared entrypoints, never its source or its build
       * output, so that admin consumes the same artifact api and portfolio do.
       */
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src',
              from: '../data-service',
              message:
                'apps may not import from api (SRS §2.1). Admin speaks to it over /api/admin/* only.',
            },
            {
              target: './src',
              from: '../portfolio',
              message:
                'apps may not import from portfolio (SRS §2.1). Shared meaning lives in packages/registry.',
            },
            {
              target: './src',
              from: '../landing-page',
              message: 'apps may not import from www (SRS §2.1).',
            },
            {
              target: './src',
              from: '../packages/registry/src',
              message:
                'import @portfolio/registry through its published entrypoints, not its source (SRS §2.1).',
            },
            {
              target: './src',
              from: '../packages/registry/dist',
              message:
                'import @portfolio/registry through its published entrypoints, not its build output (SRS §2.1).',
            },
          ],
        },
      ],
    },
  },
);
