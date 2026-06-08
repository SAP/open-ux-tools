#!/usr/bin/env node
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);
const { name, version } = require('./package.json');
const [, , ...extraArgs] = process.argv;

await build({
    entryPoints: [join(__dirname, 'src/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    outdir: join(__dirname, 'dist'),
    mainFields: ['module', 'main'],

    // Packages that must NOT be inlined into the bundle and must be present at runtime:
    // - vscode: provided by the VS Code extension host; bundling it would break activation
    // - @lancedb/lancedb: native Node addon (.node file); esbuild cannot bundle native code
    // - @xenova/transformers: large ML library with dynamic model loading; must stay external
    // - @sap-ux/fiori-docs-embeddings: optional peer — consumers may omit it; the server
    //   handles its absence gracefully via a dynamic import() with a try/catch
    // - @sap-ux/store: uses native keytar/secrets bindings; cannot be bundled
    external: ['vscode', '@lancedb/lancedb', '@xenova/transformers', '@sap-ux/fiori-docs-embeddings', '@sap-ux/store'],

    // Inline the package name and version as string literals at build time.
    // We cannot use require('../package.json') at runtime because createRequire resolves
    // paths relative to dist/index.js, and package.json sits one level above dist/ —
    // a path that is correct when run locally but breaks at different nesting depths
    // when installed (e.g. inside node_modules). Injecting at build time avoids the
    // runtime path ambiguity entirely. See src/package-info.ts for the consumer side.
    define: {
        __PACKAGE_NAME__: JSON.stringify(name),
        __PACKAGE_VERSION__: JSON.stringify(version)
    },

    // esbuild produces a single ESM bundle, but some dependencies still use CommonJS
    // patterns (require, __dirname, __filename) internally. The banner re-introduces
    // these CJS globals so that bundled CJS code continues to work inside the ESM output.
    banner: {
        js: [
            "import{createRequire}from'node:module';",
            "import{fileURLToPath}from'node:url';",
            "import{dirname}from'node:path';",
            "const require=createRequire(import.meta.url);",
            "const __filename=fileURLToPath(import.meta.url);",
            "const __dirname=dirname(__filename);"
        ].join('')
    },
    minify: extraArgs.includes('--minify'),
    sourcemap: extraArgs.includes('--sourcemap=inline') ? 'inline' : false
});
