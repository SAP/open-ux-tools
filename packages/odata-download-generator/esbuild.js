const { build } = require('esbuild');
const { dependencies } = require('./package.json');

build({
  entryPoints: ['src/app/index.ts'],
  bundle: true,
  outfile: 'generators/app/index.js',
  minify: false,
  sourcemap: true,
  target: 'node18',
  platform: 'node',
  logLevel: 'info',
  external:  Object.keys(dependencies).filter((dep) => { return dep !== '@sap-ux/odata-service-inquirer' }),
}).catch(() => process.exit(1));