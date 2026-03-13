const { build } = require('esbuild');

build({
  entryPoints: ['src/app/index.ts'],
  bundle: true,
  format: 'cjs',
  outfile: 'generators/app/index.js',
  minify: false,
  sourcemap: true,
  target: 'node18',
  platform: 'node',
  logLevel: 'info',
  external: ['vscode', 'shelljs'],
  mainFields: ["module", "main"]
}).catch(() => process.exit(1));