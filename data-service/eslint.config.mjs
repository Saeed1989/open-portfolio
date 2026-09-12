// @ts-check
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/*
 * public, admin and worker are separate surfaces in one process (SRS §2.1) and
 * may not import from each other. schemas, common, external and
 * @portfolio/registry are shared.
 */
const surfaces = ['public', 'admin', 'worker'];

const boundaries = surfaces.map((surface) => ({
  files: [`src/${surface}/**/*.ts`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: surfaces
          .filter((other) => other !== surface)
          .map((other) => ({
            regex: `(^|/)${other}(/|$)`,
            message: `${surface} may not import from ${other} (SRS §2.1).`,
          })),
      },
    ],
  },
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
  ...boundaries,
);
