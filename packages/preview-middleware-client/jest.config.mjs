import path from 'path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import baseConfig from '../../jest.base.mjs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = { ...baseConfig };
config.testEnvironment = '<rootDir>/test/jest-environment-jsdom-writablelocation.js';
// Allow transforming workspace ESM packages in node_modules
config.transformIgnorePatterns = ['node_modules/(?!(@sap-ux-private|@sap-ux)/)'];
// Resolve vscode-languageserver-types CJS/UMD from its sibling package (avoids ESM exports condition in jsdom)
const vscodeTextdocDir = path.dirname(path.dirname(require.resolve('vscode-languageserver-textdocument')));
config.moduleNameMapper = {
    // Strip .js extensions from relative imports for Jest resolution (NodeNext compat)
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^sap/(.+)$': '<rootDir>/test/__mock__/sap/$1.ts',
    // Jest will try to load browser version, because environment is set to jsdom, but that is not what we want
    // https://jest-archive-august-2023.netlify.app/docs/28.x/upgrading-to-jest28#packagejson-exports
    '^@sap-ux/i18n$': require.resolve('@sap-ux/i18n'),
    // same as above, starting 1.0.11 "exports" property is added in package.json
    'vscode-languageserver-textdocument': require.resolve('vscode-languageserver-textdocument'),
    // vscode-languageserver-types exports ESM as browser/import condition - map to CJS/UMD for Jest jsdom environment
    'vscode-languageserver-types': require.resolve('vscode-languageserver-types', { paths: [vscodeTextdocDir] }),
    '^mock/(.+)$': '<rootDir>/test/__mock__/$1.ts',
    '^open/ux/preview/client/(.+)$': '<rootDir>/src/$1.ts'
};
config.transform = {
    '^.+\\.[jt]s$': [
        'ts-jest',
        {
            useESM: true,
            tsconfig: path.join(__dirname, 'tsconfig.eslint.json')
        }
    ]
};
export default config;
