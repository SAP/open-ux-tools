'use strict';

const {
    // esbuildOptions,
    build
} = require('../../esbuildConfig');
const { writeFileSync, readFileSync } = require('fs');
const path = require('path');

// Create custom esbuild options for fiori-mcp-server
const customEsbuildOptions = {
    write: true,
    bundle: true,
    metafile: true,
    sourcemap: true, // .vscodeignore ignores .map files when bundling!!
    minify: true,
    logLevel: 'warning',
    loader: {
        '.jpg': 'file',
        '.gif': 'file',
        '.mp4': 'file',
        '.graphql': 'text',
        '.png': 'file',
        '.svg': 'file'
    },

    external: [
        'vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be bundled
        '@zowe/secrets-for-zowe-sdk',
        'faiss-node'
    ],
    plugins: [],
    entryPoints: {
        index: './src/index.ts'
    },
    mainFields: ['browser', 'module', 'main'],
    outdir: './dist',
    platform: 'node',
    target: 'node20',
    format: 'cjs'
};

// Add a plugin to replace the resourceId during build
customEsbuildOptions.plugins = [
    ...(customEsbuildOptions.plugins || []),
    {
        name: 'replace-resource-id',
        setup(build) {
            build.onEnd(() => {
                const telemetryIndexPath = path.join(__dirname, 'dist/index.js');
                const resourceId = process.env.INSTRUMENTATION_KEY_DEV;

                try {
                    let content = readFileSync(telemetryIndexPath, 'utf8');
                    content = content.replace(/resourceId:\s*['"`]resource-id['"`]/g, `resourceId: '${resourceId}'`);
                    writeFileSync(telemetryIndexPath, content, 'utf8');
                    console.log(`Resource ID replaced with: ${resourceId}`);
                } catch (error) {
                    console.warn(`Could not replace resourceId in ${telemetryIndexPath}:`, error.message);
                }
            });
        }
    }
];

module.exports = {
    esbuildOptions: customEsbuildOptions
};

build(customEsbuildOptions, process.argv.slice(2));
