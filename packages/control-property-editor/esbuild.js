const { esbuildOptionsBrowser, build } = require('../../esbuildConfig');
const NodeModulesPolyfills = require('@esbuild-plugins/node-modules-polyfill');
const { copy } = require('esbuild-plugin-copy');
const alias = require('esbuild-plugin-alias');

// Set esbuild options for this build
esbuildOptionsBrowser.plugins = esbuildOptionsBrowser.plugins.concat(
    alias({
        'react': require.resolve('react'),
        'react-dom': require.resolve('react-dom')
    })
);
const esbuildOptions = { ...esbuildOptionsBrowser };

esbuildOptions.external = esbuildOptions.external.concat([]);
esbuildOptions.entryPoints = {
    app: './src/index.tsx'
};
esbuildOptions.format = 'esm';
esbuildOptions.plugins = esbuildOptions.plugins.concat([NodeModulesPolyfills.NodeModulesPolyfillPlugin()]);

module.exports = {
    esbuildOptions
};

build(esbuildOptions, process.argv.slice(2));
