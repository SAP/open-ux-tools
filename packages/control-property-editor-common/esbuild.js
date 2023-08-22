const { esbuildOptionsBrowser, build } = require('../../esbuildConfig');
const NodeModulesPolyfills = require('@esbuild-plugins/node-modules-polyfill');

// Set esbuild options for this build
const esbuildOptions = { ...esbuildOptionsBrowser };

esbuildOptions.external = esbuildOptions.external.concat([]);
esbuildOptions.entryPoints = {
    bundle: './src/index.ts'//,
    // 'ui5-adaptation': './src/adaptation/ui5'
};
esbuildOptions.plugins = esbuildOptions.plugins.concat([NodeModulesPolyfills.NodeModulesPolyfillPlugin()]);
esbuildOptions.globalName = 'sap.ux.cpe.common'
esbuildOptions.footer = {
    js: `window['@sap-ux'] = { 'control-property-editor-common' : sap.ux.cpe.common }`
  }

module.exports = {
    esbuildOptions
};


build(esbuildOptions, process.argv.slice(2));
