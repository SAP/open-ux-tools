const { esbuildOptionsBrowser, build } = require('../../esbuildConfig');
const NodeModulesPolyfills = require('@esbuild-plugins/node-modules-polyfill');

// Set esbuild options for this build
const esbuildOptions = { ...esbuildOptionsBrowser };

esbuildOptions.external = esbuildOptions.external.concat([]);
esbuildOptions.entryPoints = {
    app: './src/app/index.tsx',
    'ui5-adaptation': './src/adaptation/ui5'
};
esbuildOptions.format = 'esm';
esbuildOptions.plugins = esbuildOptions.plugins.concat([NodeModulesPolyfills.NodeModulesPolyfillPlugin()]);

module.exports = {
    esbuildOptions
};

build(esbuildOptions, process.argv.slice(2));
