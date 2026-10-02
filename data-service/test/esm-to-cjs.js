/*
 * sanitize-html's parser dependencies ship as ESM only. Node loads them with
 * require(esm); Jest's module runtime cannot, so they are transpiled to
 * CommonJS for the test run only.
 */
const ts = require('typescript');

module.exports = {
  process(source, fileName) {
    const { outputText } = ts.transpileModule(source, {
      fileName,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2021,
        allowJs: true,
      },
    });
    return { code: outputText };
  },
};
