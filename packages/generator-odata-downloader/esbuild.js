const { build } = require('esbuild');
const production = process.argv.includes('--production');

build({
  entryPoints: ['src/app/index.ts'],
  bundle: true,
  format: 'cjs',
  outfile: 'generators/app/index.js',
  minify: production,
  sourcemap: !production,
  target: 'node18',
  platform: 'node',
  logLevel: 'info',
  external: ['vscode', 'yeoman-generator'],
  mainFields: ["module", "main"]
}).catch(() => process.exit(1));