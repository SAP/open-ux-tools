import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);
const production = process.argv.includes('--production');

// Re-introduce CJS globals in the ESM bundle so bundled CJS dependencies continue to work.
const cjsCompatBanner = [
    "import{createRequire}from'node:module';",
    "import{fileURLToPath}from'node:url';",
    "import{dirname}from'node:path';",
    "const require=createRequire(import.meta.url);",
    "const __filename=fileURLToPath(import.meta.url);",
    "const __dirname=dirname(__filename);"
].join('');

/** @type {import('esbuild').BuildOptions} */
const sharedOptions = {
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    mainFields: ['module', 'main'],
    minify: production,
    sourcemap: !production,
    banner: { js: cjsCompatBanner }
};

// Main plugin entry point
await build({
    ...sharedOptions,
    entryPoints: [join(__dirname, 'src/index.ts')],
    outfile: join(__dirname, 'lib/index.js'),
    // eslint and typescript-eslint are peerDependencies provided by the consumer.
    // @babel/core is a peerDependency of @babel/eslint-parser — it's required
    // dynamically at runtime so esbuild cannot trace or inline it.
    external: ['eslint', 'typescript-eslint', '@babel/core', 'globals'],
});

// Worker: finds Fiori artifacts (called via synckit from project-context.ts)
await build({
    ...sharedOptions,
    entryPoints: [join(__dirname, 'src/project-context/artifacts.ts')],
    outfile: join(__dirname, 'lib/project-context/artifacts.js'),
});

// Worker: resolves path mappings synchronously (called via synckit from index.ts)
await build({
    ...sharedOptions,
    entryPoints: [join(__dirname, 'src/worker-getPathMappingsSync.ts')],
    outfile: join(__dirname, 'lib/worker-getPathMappingsSync.js'),
});
