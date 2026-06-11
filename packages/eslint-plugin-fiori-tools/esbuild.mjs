import { context, build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve @babel/eslint-parser's worker from this package's dependency tree.
const req = createRequire(join(__dirname, 'package.json'));
const babelEslintParserDir = dirname(req.resolve('@babel/eslint-parser'));
const babelEslintParserWorker = resolve(babelEslintParserDir, 'worker/index.js');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

// Re-introduce CJS globals in the ESM bundle so bundled CJS dependencies continue to work.
// Use aliased imports to avoid clashing with identifiers esbuild emits from the source.
const cjsCompatBanner = [
    "import{createRequire as __cjsCreateRequire}from'node:module';",
    "import{fileURLToPath as __cjsFileURLToPath}from'node:url';",
    "import{dirname as __cjsDirname}from'node:path';",
    'var require=__cjsCreateRequire(import.meta.url);',
    'var __filename=__cjsFileURLToPath(import.meta.url);',
    'var __dirname=__cjsDirname(__filename);'
].join('');

// @babel/eslint-parser@8 loads @babel/parser via createRequire() at runtime,
// which breaks in consumer projects where @babel/parser isn't a direct dependency.
// This plugin intercepts the file during bundling and replaces the dynamic require
// with a static import so esbuild can bundle @babel/parser directly.
// Note: WorkerClient spawns lib/worker/index.js via new Worker(path.resolve(import.meta.dirname,
// "../lib/worker/index.js")) — that path resolves correctly once we add the worker as an entry point.
const patchBabelEslintParser = {
    name: 'patch-babel-eslint-parser',
    setup(build) {
        build.onLoad({ filter: /@babel[\\/]eslint-parser[\\/]lib[\\/]index\.js$/ }, (args) => {
            let source = readFileSync(args.path, 'utf8');
            const patched = source.replace(
                /const require\$1 = createRequire\(import\.meta\.url\);\nconst babelParser = require\$1\(require\$1\.resolve\("@babel\/parser",\s*\{\s*paths:\s*\[require\$1\.resolve\("@babel\/core\/package\.json"\)\]\s*\}\)\);/,
                'import * as babelParser from "@babel/parser";'
            );
            if (patched === source) {
                throw new Error(
                    '[patch-babel-eslint-parser] Failed to patch @babel/eslint-parser/lib/index.js: ' +
                    'the createRequire-based @babel/parser load was not found. ' +
                    'The upstream source has likely changed — update the patch in esbuild.mjs.'
                );
            }
            return { contents: patched, loader: 'js' };
        });
    }
};

// eslint is a peerDependency provided by the consumer.
// @typescript-eslint/eslint-plugin and @typescript-eslint/parser are runtime dependencies —
// marking them external drops the ~3.5 MB typescript.js from the bundle.
// @babel/* are bundled (not external) so consumers don't need them as direct dependencies.
const externalDependencies = [
    'eslint',
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser'
];

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    mainFields: ['module', 'main'],
    // splitting extracts shared code (e.g. @sap-ux/project-access) into a single chunk
    // instead of duplicating it across index.js and each worker bundle.
    splitting: true,
    outdir: join(__dirname, 'lib'),
    entryPoints: [
        { in: join(__dirname, 'src/index.ts'), out: 'index' },
        { in: join(__dirname, 'src/project-context/artifacts.ts'), out: 'project-context/artifacts' },
        { in: join(__dirname, 'src/worker-getPathMappingsSync.ts'), out: 'worker-getPathMappingsSync' },
        { in: babelEslintParserWorker, out: 'worker/index' }
    ],
    minify: production,
    sourcemap: !production,
    banner: { js: cjsCompatBanner },
    external: externalDependencies,
    plugins: [patchBabelEslintParser]
};

if (watch) {
    const ctx = await context(buildOptions);
    await ctx.watch();
    console.log('[watch] watching for changes...');
} else {
    await build(buildOptions);
}
