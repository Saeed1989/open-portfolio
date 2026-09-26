// @ts-check
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/*
 * public, admin and auth are separate surfaces in one process (SRS §2.1) and
 * may not import from each other. schemas, common, external and
 * @portfolio/registry are shared.
 *
 * The one crossing is FR-AUTH-17: other surfaces may import the auth module
 * and its declared interface, and nothing else of auth's. Nor may they take
 * the `users` or `sessions` model from schemas, so no module outside auth can
 * register one.
 */
const surfaces = ['public', 'admin', 'auth'];

const AUTH_INTERFACE = '(auth\\.module|auth-account\\.service)$';

const boundaries = surfaces.map((surface) => ({
  files: [`src/${surface}/**/*.ts`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          ...surfaces
            .filter((other) => other !== surface)
            .map((other) => ({
              regex:
                other === 'auth'
                  ? `(^|/)auth(/(?!${AUTH_INTERFACE})|$)`
                  : `(^|/)${other}(/|$)`,
              message: `${surface} may not import from ${other} (SRS §2.1).`,
            })),
          ...(surface === 'auth'
            ? []
            : [
                {
                  regex: '(^|/)schemas/(user|session)\\.schema$',
                  importNames: [
                    'User',
                    'UserSchema',
                    'Session',
                    'SessionSchema',
                  ],
                  message: `Only auth registers users or sessions (FR-AUTH-17).`,
                },
              ]),
        ],
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
