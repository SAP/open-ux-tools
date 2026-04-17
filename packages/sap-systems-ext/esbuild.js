const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const fixImportMetaPlugin = {
    name: 'fix-import-meta',
    setup(build) {
        // Transform import.meta.url usage to work in CJS bundle
        build.onLoad({ filter: /\.(ts|js)$/ }, async (args) => {
            // Skip node_modules except workspace packages
            if (args.path.includes('node_modules') && !args.path.includes('packages/')) {
                return null;
            }

            let contents = await fs.promises.readFile(args.path, 'utf8');

            // Only process files that use import.meta.url
            if (!contents.includes('import.meta.url')) {
                return null;
            }

            // Replace createRequire(import.meta.url) with __filename
            contents = contents.replace(/createRequire\(import\.meta\.url\)/g, 'createRequire(__filename)');

            // Replace fileURLToPath(import.meta.url) with __filename
            contents = contents.replace(/fileURLToPath\(import\.meta\.url\)/g, '__filename');

            // Replace standalone import.meta.url with __filename (as file:// URL for createRequire)
            contents = contents.replace(/\bimport\.meta\.url\b/g, '"file://" + __filename');

            return {
                contents,
                loader: args.path.endsWith('.ts') ? 'ts' : 'js'
            };
        });
    }
};

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
const bundleZowePlugin = {
    name: 'bundle-zowe',

    setup(build) {
        // Rewrite require calls to @zowe/secrets-for-zowe-sdk to use our wrapper
        build.onEnd(async (result) => {
            const outputFile = path.join(__dirname, 'dist', 'extension.js');

            if (fs.existsSync(outputFile)) {
                let contents = await fs.promises.readFile(outputFile, 'utf8');

                // Replace require('@zowe/secrets-for-zowe-sdk') with require of our wrapper
                // The wrapper will be at ./zowe-keyring-wrapper (relative to dist/extension.js)
                contents = contents.replace(
                    /require\d*\(["']@zowe\/secrets-for-zowe-sdk["']\)/g,
                    `require("./zowe-keyring-wrapper")`
                );

                await fs.promises.writeFile(outputFile, contents, 'utf8');
            }

            // Generate wrapper dynamically
            const wrapperCode = `/*
 * Auto-generated wrapper for @zowe/secrets-for-zowe-sdk
 * This wrapper loads native keyring modules from the bundled prebuilds directory
 */

const { join } = require('path');
const { existsSync } = require('fs');

function getTargetName() {
    switch (process.platform) {
        case 'win32':
            return \`win32-\${process.arch}-msvc\`;
        case 'linux':
            const isMusl = process.report.getReport().header.glibcVersionRuntime == null;
            const abi = isMusl ? 'musl' : 'gnu';
            switch (process.arch) {
                case 'arm':
                    return \`linux-arm-\${abi}eabihf\`;
                default:
                    return \`linux-\${process.arch}-\${abi}\`;
            }
        case 'darwin':
        default:
            return \`\${process.platform}-\${process.arch}\`;
    }
}

function loadKeyring() {
    // In bundled extension, __dirname will be the dist folder
    // Prebuilds are in prebuilds/ at the extension root (one level up from dist)
    const prebuildsDir = join(__dirname, '..', 'prebuilds');
    const binaryName = \`keyring.\${getTargetName()}.node\`;
    const binaryPath = join(prebuildsDir, binaryName);

    if (!existsSync(binaryPath)) {
        throw new Error(\`Native module not found: \${binaryPath}\`);
    }

    const {
        deletePassword,
        findCredentials,
        findPassword,
        getPassword,
        setPassword,
    } = require(binaryPath);

    return {
        deletePassword,
        findCredentials,
        findPassword,
        getPassword,
        setPassword,
    };
}

module.exports.keyring = loadKeyring();
`;

            const wrapperDest = path.join(__dirname, 'dist', 'zowe-keyring-wrapper.js');
            await fs.promises.writeFile(wrapperDest, wrapperCode, 'utf8');

            // Copy prebuilds
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
        external: ['vscode'],
        logLevel: 'silent',
        plugins: [
            fixImportMetaPlugin,
            bundleZowePlugin,
            copyWebappPlugin,
            /* add to the end of plugins array */
            esbuildProblemMatcherPlugin
        ],
        mainFields: ['module', 'main']
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
