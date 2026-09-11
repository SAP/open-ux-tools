/**
 * esbuild build configuration for `open-ux-tools`.
 *
 * Exports:
 *   - `esbuildOptionsBrowser`: browser-targeted build options
 *   - `build(options, args)`: CLI-friendly build runner
 *
 * The configuration includes support for Sass, CSS modules, autoprefixing,
 * metadata output, source maps, and optional CLI flags for minify/watch.
 *
 * @typedef {import('esbuild').BuildOptions} BuildOptions
 */
import { sassPlugin, postcssModules } from 'esbuild-sass-plugin';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import yargsParser from 'yargs-parser';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

/**
 * esbuild plugin that resolves `react-virtualized` to its UMD bundle.
 *
 * This workaround is required for React Virtualized versions affected by
 * issue #1212 / #1632 until a fixed release is available.
 * @type {import('esbuild').Plugin}
 */
const resolveFixup = {
    name: 'resolve-fixup',
    setup(build) {
        build.onResolve({ filter: /react-virtualized/ }, async (args) => {
            return {
                path: fileURLToPath(import.meta.resolve('react-virtualized/dist/umd/react-virtualized.js'))
            };
        });
    }
};

/** Shared base esbuild options used by all targets. */
const commonConfig = {
    write: true,
    bundle: true,
    metafile: true,
    sourcemap: true,
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

    external: [],
    plugins: []
};
/**
 * CSS Modules transform instance used by the Sass plugin for `.module.scss` files.
 * @type {import('esbuild-sass-plugin').PostcssModulesResult}
 */
const transformModule = postcssModules({});
/** Browser-targeted esbuild options for the webview and browser bundle. */
const browserConfig = {
    entryPoints: {
        index: 'src/index.ts',
        bundle: 'src/webview/index.tsx'
    },
    mainFields: ['browser', 'module', 'main'],
    outdir: './dist',
    platform: 'browser',
    target: 'chrome90',
    format: 'iife',
    plugins: [
        resolveFixup,
        sassPlugin({
            async transform(source, dirname, path) {
                if (path.endsWith('.module.scss')) {
                    return transformModule.apply(this, [source, dirname, path]);
                }
                const { css } = await postcss([autoprefixer]).process(source);
                return css;
            }
        })
    ]
};
/**
 * Apply CLI overrides to a base esbuild options object.
 *
 * Supported CLI flags:
 *   --minify
 *   --watch
 *   --metafile
 *   --sourcemap
 *
 * @param {BuildOptions} options - base esbuild build options
 * @param {string[]} [args=[]] - raw CLI arguments
 * @returns {BuildOptions}
 */
const handleCliParams = (options, args = []) => {
    const outOptions = { ...options };
    const yargs = yargsParser(args);

    outOptions.minify = yargs.minify ? true : outOptions.minify;
    outOptions.minify = yargs.minify === 'false' ? false : outOptions.minify;

    outOptions.watch = yargs.watch ? true : outOptions.watch;
    outOptions.watch = yargs.watch === 'false' ? false : outOptions.watch;

    outOptions.metafile = yargs.metafile ? true : outOptions.metafile;
    outOptions.metafile = yargs.metafile === 'false' ? false : outOptions.metafile;

    outOptions.sourcemap = yargs.sourcemap !== undefined ? yargs.sourcemap : outOptions.sourcemap;

    return outOptions;
};
/**
 * Build the project with esbuild and optional CLI-driven mode overrides.
 *
 * If `watch` is enabled, this starts a long-running watch context. Otherwise,
 * it executes a single build and optionally writes `esbuild-stats.json` when
 * `metafile` is enabled.
 *
 * @param {BuildOptions} options - base esbuild build options
 * @param {string[]} args - raw CLI arguments
 */
const build = async (options, args) => {
    const finalConfig = handleCliParams(options, args);
    const isWatch = finalConfig.watch;
    delete finalConfig.watch;
    if (isWatch) {
        const contextObj = await esbuild.context(finalConfig);
        await contextObj.watch();
        console.log('[watch] build started');
    } else {
        try {
            const result = await esbuild.build(finalConfig);
            if (finalConfig.metafile) {
                const statsFile = 'esbuild-stats.json';
                writeFileSync(statsFile, JSON.stringify(result.metafile));
                console.log(`Wrote esbuild stats file ${statsFile}. Analyse at https://bundle-buddy.com/esbuild/`);
            }
            console.log('[build] build finished');
        } catch (error) {
            console.log(error.message);
            process.exit(1);
        }
    }
};

export const esbuildOptionsBrowser = { ...commonConfig, ...browserConfig };
export { build };
