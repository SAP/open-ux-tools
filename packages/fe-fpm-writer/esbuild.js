const pkg = require("./package.json")

require('esbuild').buildSync({
    bundle: true,
    loader: { '.data': 'binary' },
    outdir: './dist/templates',
    entryPoints: ['src/templates/index.ts'],
    mainFields: ['module', 'main'], // https://stackoverflow.com/a/69352281
    target: 'node18',
    platform: 'node',
    format: 'cjs'
});
