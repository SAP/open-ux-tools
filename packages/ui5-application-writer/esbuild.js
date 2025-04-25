const pkg = require('./package.json');
const NodeModulesPolyfills = require('@esbuild-plugins/node-modules-polyfill');

require('esbuild').build({
    bundle: true,
    loader: { '.data': 'binary', '.ejs': 'text' },
    outdir: './dist',
    entryPoints: ['src/index.ts'],
    external: [
        // 'mem-fs',
        // 'mem-fs-editor',
        'binaryextensions',
        'textextensions',
        '@sap-ux/project-access'
        // ...Object.keys(pkg.dependencies || {}),
        // ...Object.keys(pkg.peerDependencies || {}),
        // ...Object.keys(pkg.devDependencies || {})
    ],
    mainFields: ['browser', 'module', 'main'],
    target: 'es2020',
    platform: 'browser',
    format: 'iife',
    sourcemap: true,
    plugins: [NodeModulesPolyfills.NodeModulesPolyfillPlugin()]
});
