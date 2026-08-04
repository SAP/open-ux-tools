import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import baseConfig from '../../jest.base.mjs';

const __dirname = import.meta.dirname;
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
    '^@sap/ux-cds-compiler-facade$': '<rootDir>/test/__mocks__/@sap/ux-cds-compiler-facade.ts'
};
// Allow @vscode-logging/logger CJS module to be transformed for ESM named-export interop
config.transformIgnorePatterns = [
    'node_modules/(?!(?:.*?/)?(@sap-ux|@sap-ux-private|@sap/ux-cds-compiler-facade|@vscode-logging|@sap-devx[+/]yeoman-ui-types)/)'
];
// Add package-specific setup file to mock CJS modules before any source imports
config.setupFiles = [...(config.setupFiles || []), '<rootDir>/jest.setup.mjs'];
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
export default config;
