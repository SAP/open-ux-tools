const { build } = require('../../esbuildConfig');

let ui5Plugin = {
    name: 'sap-ui5',
    setup(build) {
        'use strict';
        // Intercept import paths to UI5 code
        build.onResolve({ filter: /^sap\/.*/ }, (args) => ({
            path: args.path,
            namespace: 'sap-ui5'
        }));

        // Load paths tagged with the "sap-ui5" namespace and replace them with require statements
        build.onLoad({ filter: /.*/, namespace: 'sap-ui5' }, ({ path }) => ({
            contents: `export default await __ui5_require_async('${path}');`,
            loader: 'ts'
        }));
    }
};

// Set esbuild options for this build
const esbuildOptions = {
    write: true,
    bundle: true,
    metafile: true,
    sourcemap: true,
    minify: true,
    logLevel: 'warning',
    entryPoints: {
        index: 'src/index.ts'
    },
    footer: {
        js: `function __ui5_require_async(path) {
    return new Promise(function(resolve, reject) {
        sap.ui.require([path], function(module) {
         resolve(module);
        }, function(err) {
         reject(err);
        });
    });
}`
    },
    mainFields: ['browser', 'module', 'main'],
    outdir: './dist',
    platform: 'browser',
    target: 'es2022',
    format: 'esm',
    plugins: [ui5Plugin]
};

module.exports = {
    esbuildOptions
};

build(esbuildOptions, process.argv.slice(2));
