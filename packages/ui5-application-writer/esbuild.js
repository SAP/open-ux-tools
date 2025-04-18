const pkg = require('./package.json');

require('esbuild').build({
    bundle: true,
    loader: { '.data': 'binary', '.ejs': 'text' },
    outdir: './dist',
    entryPoints: ['src/index.ts'],
    external: [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.peerDependencies || {}),
        ...Object.keys(pkg.devDependencies || {})
    ],
    mainFields: ['module', 'main'], // https://stackoverflow.com/a/69352281
    target: 'node18',
    platform: 'node',
    format: 'cjs',
    sourcemap: true
});
