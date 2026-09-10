import { defineConfig } from 'tsup';

export default defineConfig({
  /* Named rather than a bare array: an array entry puts src/validation/index.ts
     at dist/validation/index.js, and the exports map in package.json — the
     contract api and admin consume — points at dist/validation.js. */
  entry: {
    index: 'src/index.ts',
    validation: 'src/validation/index.ts',
    sanitize: 'src/sanitize.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
});
