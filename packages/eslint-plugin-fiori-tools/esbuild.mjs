import { context, build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);
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

// eslint and typescript-eslint are peerDependencies provided by the consumer.
// @babel/core is a peerDependency of @babel/eslint-parser — it's required
// dynamically at runtime so esbuild cannot trace or inline it.
const externalDependencies = ['eslint', 'typescript-eslint', '@babel/core', '@babel/eslint-parser', '@babel/parser'];

const entryPoints = [
    { in: join(__dirname, 'src/index.ts'), out: join(__dirname, 'lib/index.js') },
    { in: join(__dirname, 'src/project-context/artifacts.ts'), out: join(__dirname, 'lib/project-context/artifacts.js') },
    { in: join(__dirname, 'src/worker-getPathMappingsSync.ts'), out: join(__dirname, 'lib/worker-getPathMappingsSync.js') }
];

if (watch) {
    const contexts = await Promise.all(
        entryPoints.map(({ in: entryPoint, out: outfile }) =>
            context({ ...sharedOptions, entryPoints: [entryPoint], outfile, external: externalDependencies })
        )
    );
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log('[watch] watching for changes...');
} else {
    await Promise.all(
        entryPoints.map(({ in: entryPoint, out: outfile }) =>
            build({ ...sharedOptions, entryPoints: [entryPoint], outfile, external: externalDependencies })
        )
    );
}
