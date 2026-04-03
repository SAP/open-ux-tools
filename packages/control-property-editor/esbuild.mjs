import { esbuildOptionsBrowser, build } from '../../esbuildConfig.mjs';
import NodeModulesPolyfills from '@esbuild-plugins/node-modules-polyfill';
import { copy } from 'esbuild-plugin-copy';
import alias from 'esbuild-plugin-alias';

// Set esbuild options for this build
esbuildOptionsBrowser.plugins = esbuildOptionsBrowser.plugins.concat(
    alias({
        'react': import.meta.resolve('react'),
        'react-dom': import.meta.resolve('react-dom')
    })
);
const esbuildOptions = { ...esbuildOptionsBrowser };

esbuildOptions.external = esbuildOptions.external.concat([]);
esbuildOptions.entryPoints = {
    app: './src/index.tsx'
};
esbuildOptions.format = 'esm';
esbuildOptions.plugins = esbuildOptions.plugins.concat([NodeModulesPolyfills.NodeModulesPolyfillPlugin()]);

build(esbuildOptions, process.argv.slice(2));
