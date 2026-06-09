import { context, build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

// Re-introduce CJS globals in the ESM bundle so bundled CJS dependencies continue to work.
// Use aliased imports to avoid clashing with identifiers esbuild emits from the source.
const cjsCompatBanner = [
    "import{createRequire as __cjsCreateRequire}from'node:module';",
    "import{fileURLToPath as __cjsFileURLToPath}from'node:url';",
    "import{dirname as __cjsDirname}from'node:path';",
    'const require=__cjsCreateRequire(import.meta.url);',
    'const __filename=__cjsFileURLToPath(import.meta.url);',
    'const __dirname=__cjsDirname(__filename);'
].join('');

// eslint is a peerDependency provided by the consumer.
// @typescript-eslint/eslint-plugin and @typescript-eslint/parser are runtime dependencies —
// marking them external drops the ~3.5 MB typescript.js from the bundle.
// @babel/* are peerDependencies of @babel/eslint-parser — required dynamically at runtime.
const externalDependencies = [
    'eslint',
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser',
    '@babel/core',
    '@babel/eslint-parser',
    '@babel/parser'
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
        { in: join(__dirname, 'src/worker-getPathMappingsSync.ts'), out: 'worker-getPathMappingsSync' }
    ],
    minify: production,
    sourcemap: !production,
    banner: { js: cjsCompatBanner },
    external: externalDependencies
};

if (watch) {
    const ctx = await context(buildOptions);
    await ctx.watch();
    console.log('[watch] watching for changes...');
} else {
    await build(buildOptions);
}
