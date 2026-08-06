'use strict';

// Jest transformer that string-patches @babel/eslint-parser@8.0.0-rc.6/lib/index.js so
// it imports @babel/parser statically instead of via createRequire(). The shipped parser
// uses createRequire(import.meta.url).require('@babel/parser') which throws under Jest's
// --experimental-vm-modules because the VM-modules runtime cannot satisfy a sync CJS-style
// require for a pure-ESM module like @babel/parser@8. Production runtime is unaffected:
// Node 22.12+ supports require(esm) natively, so the unpatched parser loads fine there.
module.exports = {
    process(sourceText) {
        const importReplaced = sourceText.replace(
            "import { createRequire } from 'node:module';",
            "import * as babelParser from '@babel/parser';"
        );
        const requireRemoved = importReplaced.replace(
            /const require\$1 = createRequire\(import\.meta\.url\);\s*const babelParser = require\$1\(require\$1\.resolve\("@babel\/parser",\s*\{\s*paths:\s*\[require\$1\.resolve\("@babel\/core\/package\.json"\)\]\s*\}\)\);/,
            ''
        );
        if (importReplaced === sourceText || requireRemoved === importReplaced) {
            throw new Error(
                '[babel-eslint-parser.transformer] Failed to patch @babel/eslint-parser/lib/index.js: ' +
                    'expected createRequire-based @babel/parser load not found. ' +
                    'The upstream source has likely changed — update the transformer.'
            );
        }
        return { code: requireRemoved };
    }
};
