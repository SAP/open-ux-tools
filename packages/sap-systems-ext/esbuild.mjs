import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
    name: 'esbuild-problem-matcher',

    setup(build) {
        build.onStart(() => {
            console.log('[watch] build started');
        });
        build.onEnd((result) => {
            result.errors.forEach(({ text, location }) => {
                console.error(`✘ [ERROR] ${text}`);
                console.error(`    ${location.file}:${location.line}:${location.column}:`);
            });
            console.log('[watch] build finished');
        });
    }
};

/**
 * @type {import('esbuild').Plugin}
 */
const copyPrebuildsPlugin = {
    name: 'copy-prebuilds',

    setup(build) {
        build.onEnd(async () => {
            const sourceModule = '@zowe/secrets-for-zowe-sdk';
            const sourceModuleUrl = import.meta.resolve(sourceModule);
            const sourceDir = path.join(path.dirname(new URL(sourceModuleUrl).pathname), '..', 'prebuilds');
            const targetDir = path.join(__dirname, 'prebuilds');

            if (fs.existsSync(sourceDir)) {
                await fs.promises.cp(sourceDir, targetDir, { recursive: true });
                console.log(`Copied prebuilds from ${sourceModule} to ./prebuilds`);
            } else {
                console.warn(`Warning: prebuilds folder not found in ${sourceModule}`);
            }
        });
    }
};

/**
 * @type {import('esbuild').Plugin}
 */
const copyWebappPlugin = {
    name: 'copy-webapp',

    setup(build) {
        build.onEnd(async () => {
            const sourceModule = '@sap-ux/sap-systems-ext-webapp';
            const sourceModuleUrl = import.meta.resolve(sourceModule);
            const sourceDir = path.join(path.dirname(new URL(sourceModuleUrl).pathname), '..', 'dist');
            const targetDir = path.join(__dirname, 'dist', 'webapp');

            if (fs.existsSync(sourceDir)) {
                await fs.promises.cp(sourceDir, targetDir, { recursive: true });
                console.log(`Copied dist from ${sourceModule} to ./dist/webapp`);
            } else {
                console.warn(`Warning: dist folder not found in ${sourceModule} at ${sourceDir}`);
            }
        });
    }
};

async function main() {
    const ctx = await esbuild.context({
        entryPoints: ['src/extension.ts'],
        bundle: true,
        format: 'cjs',
        minify: production,
        sourcemap: !production,
        sourcesContent: false,
        platform: 'node',
        outfile: 'dist/extension.js',
        external: ['vscode'],
        logLevel: 'silent',
        plugins: [
            copyPrebuildsPlugin,
            copyWebappPlugin,
            /* add to the end of plugins array */
            esbuildProblemMatcherPlugin
        ],
        mainFields: ["module", "main"],
    });
    if (watch) {
        await ctx.watch();
    } else {
        await ctx.rebuild();
        await ctx.dispose();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
