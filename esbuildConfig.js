const { sassPlugin, postcssModules } = require('esbuild-sass-plugin');
const autoprefixer = require('autoprefixer');
const postcss = require('postcss');
const yargsParser = require('yargs-parser');
const { writeFileSync } = require('fs');
const { resolve, join } = require('path');

// from https://github.com/bvaughn/react-virtualized/issues/1212#issuecomment-847759202 workaround for https://github.com/bvaughn/react-virtualized/issues/1632 until it is released.
const resolveFixup = {
    name: 'resolve-fixup',
    setup(build) {
        build.onResolve({ filter: /react-virtualized/ }, async (args) => {
            return {
                path: require.resolve('react-virtualized/dist/umd/react-virtualized.js')
            };
        });
    }
};

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
const transformModule = postcssModules({});
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
const build = (options, args) => {
    const finalConfig = handleCliParams(options, args);
      if (finalConfig.watch) {
        // needed by https://github.com/connor4312/esbuild-problem-matchers if installed in vscode
        finalConfig.watch = {
            onRebuild(error, result) {
                console.log('[watch] build started');
                if (error) {
                    error.errors.forEach((error) =>
                        console.error(
                            `> ${error.location.file}:${error.location.line}:${error.location.column}: error: ${error.text}`
                        )
                    );
                } else console.log('[watch] build finished');
            }
        };
    }
    require('esbuild')
        .build(finalConfig)
        .then((result) => {
            if (finalConfig.metafile) {
                const statsFile = 'esbuild-stats.json';
                writeFileSync(statsFile, JSON.stringify(result.metafile));
                console.log(`Wrote esbuild stats file ${statsFile}. Analyse at https://bundle-buddy.com/esbuild/`);
            }
        })
        .then(() => {
            console.log('[watch] build finished');
        })
        .catch((error) => {
            console.log(error.message);
            process.exit(1);
        });
};
module.exports = {
    esbuildOptionsBrowser: { ...commonConfig, ...browserConfig },
    build
};
