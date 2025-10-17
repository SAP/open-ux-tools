const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

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
            const sourceDir = path.join(require.resolve(sourceModule), '../..', 'prebuilds');
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
            const sourceDir = path.join(path.dirname(require.resolve(sourceModule)), '..', 'dist');
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
        external: [
            'vscode',
            'jsonc-parser'
            // '@zowe/secrets-for-zowe-sdk',
        ],
        logLevel: 'silent',
        plugins: [
            copyPrebuildsPlugin,
            copyWebappPlugin,
            /* add to the end of plugins array */
            esbuildProblemMatcherPlugin
        ]
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
