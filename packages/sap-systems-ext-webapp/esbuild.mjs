import { esbuildOptionsBrowser, build } from '../../esbuildConfig.mjs';
import NodeModulesPolyfills from '@esbuild-plugins/node-modules-polyfill';
import alias from 'esbuild-plugin-alias';
import { fileURLToPath } from 'node:url';

// Set esbuild options for this build
esbuildOptionsBrowser.plugins = esbuildOptionsBrowser.plugins.concat(
    alias({
        'react': fileURLToPath(import.meta.resolve('react')),
        'react-dom': fileURLToPath(import.meta.resolve('react-dom'))
    })
);
const esbuildOptions = Object.assign({}, esbuildOptionsBrowser);

esbuildOptions.external = esbuildOptions.external.concat([]);
esbuildOptions.entryPoints = {
    store: 'src/store.tsx'
};
esbuildOptions.format = 'esm';
esbuildOptions.plugins = esbuildOptions.plugins.concat([NodeModulesPolyfills.NodeModulesPolyfillPlugin()]);

build(esbuildOptions, process.argv.slice(2));
