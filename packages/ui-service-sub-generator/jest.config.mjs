import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import baseConfig from '../../jest.base.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = { ...baseConfig };

// Build workspace source map so @sap-ux/* imports resolve to TS source instead of ESM dist
const workspaceSourceMap = {};
const packagesDir = resolve(__dirname, '..'); // packages/
for (const dir of readdirSync(packagesDir)) {
    const pkgJsonPath = resolve(packagesDir, dir, 'package.json');
    const srcIndex = resolve(packagesDir, dir, 'src', 'index.ts');
    if (existsSync(pkgJsonPath) && existsSync(srcIndex)) {
        try {
            const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
            if (pkg.name && (pkg.name.startsWith('@sap-ux/') || pkg.name.startsWith('@sap-ux-private/'))) {
                workspaceSourceMap[`^${pkg.name.replace('/', '\\/')}$`] = srcIndex;
            }
        } catch {
            // skip
        }
    }
}

config.moduleNameMapper = {
    ...config.moduleNameMapper,
    ...workspaceSourceMap,
    '^@sap-devx/yeoman-ui-types$': '<rootDir>/node_modules/@sap-devx/yeoman-ui-types/dist/cjs/src/index.js'
};
// Allow @vscode-logging/logger CJS module to be transformed for ESM named-export interop
config.transformIgnorePatterns = [
    'node_modules/(?!(@sap-ux|@sap-ux-private|@sap/ux-cds-compiler-facade|@vscode-logging)/)'
];
// Add package-specific setup file to mock CJS modules before any source imports
config.setupFiles = [...(config.setupFiles || []), '<rootDir>/jest.setup.mjs'];
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
export default config;
