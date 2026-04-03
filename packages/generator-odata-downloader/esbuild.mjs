import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const production = process.argv.includes('--production');

// Plugin to stub out npm-related modules that yeoman-generator imports but we don't use
const stubNpmModulesPlugin = {
  name: 'stub-npm-modules',
  setup(build) {
    // These modules are imported by yeoman-generator for functionality we don't use.
    // Stub them with empty modules.
    const stubModules = [
      'pacote',
      '@npmcli/arborist',
      '@npmcli/run-script',
      'npm-package-arg',
      'npm-registry-fetch',
      'shelljs'
    ];

    const filter = new RegExp(`^(${stubModules.join('|')})$`);
    build.onResolve({ filter }, (args) => ({
      path: args.path,
      namespace: 'stub-npm-modules'
    }));

    build.onLoad({ filter: /.*/, namespace: 'stub-npm-modules' }, () => ({
      contents: 'export default {};',
      loader: 'js'
    }));
  }
};

// Plugin to copy @zowe/secrets-for-zowe-sdk prebuilds (native binaries)
const copyPrebuildsPlugin = {
  name: 'copy-prebuilds',
  setup(build) {
    build.onEnd(async () => {
      const sourceModule = '@zowe/secrets-for-zowe-sdk';
      const targetDir = path.join(__dirname, 'prebuilds');

      // Try to resolve via import.meta.resolve first
      try {
        const modulePath = import.meta.resolve(`${sourceModule}/package.json`);
        const sourceDir = path.join(path.dirname(new URL(modulePath).pathname), 'prebuilds');

        if (fs.existsSync(sourceDir)) {
          await fs.promises.cp(sourceDir, targetDir, { recursive: true });
          console.log(`Copied prebuilds from ${sourceModule} to ./prebuilds`);
          return;
        }
      } catch {
        // Module not directly resolvable, try to find in pnpm store
      }

      // Fallback: Find in pnpm node_modules structure (for optional dependencies)
      const pnpmPath = path.join(__dirname, '../../node_modules/.pnpm');
      if (fs.existsSync(pnpmPath)) {
        const dirs = await fs.promises.readdir(pnpmPath);
        const zoweDir = dirs.find(d => d.startsWith('@zowe+secrets-for-zowe-sdk@'));
        if (zoweDir) {
          const sourceDir = path.join(pnpmPath, zoweDir, 'node_modules/@zowe/secrets-for-zowe-sdk/prebuilds');
          if (fs.existsSync(sourceDir)) {
            await fs.promises.cp(sourceDir, targetDir, { recursive: true });
            console.log(`Copied prebuilds from ${sourceModule} (pnpm store) to ./prebuilds`);
            return;
          }
        }
      }

      console.log(`Skipping prebuilds copy: ${sourceModule} prebuilds not found`);
    });
  }
};

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
  external: ['vscode'],
  mainFields: ["module", "main"],
  plugins: [stubNpmModulesPlugin, copyPrebuildsPlugin]
}).catch(() => process.exit(1));