const pkg = require("./package.json")

require('esbuild').buildSync({
    bundle: true,
    loader: { '.data': 'binary' },
    outdir: './dist',
    entryPoints: ['src/index.ts'],
    mainFields: ['module', 'main'], // https://stackoverflow.com/a/69352281
    target: 'node18',
    platform: 'node',
    format: 'cjs',
    external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})]
});
