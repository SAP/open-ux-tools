const path = require('path');
const config = require('../../jest.base');
config.testEnvironment = '<rootDir>/test/jest-environment-jsdom-writablelocation.js';
// Resolve vscode-languageserver-types CJS/UMD from its sibling package (avoids ESM exports condition in jsdom)
const vscodeTextdocDir = path.dirname(path.dirname(require.resolve('vscode-languageserver-textdocument')));
config.moduleNameMapper = {
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
    '^.+\\.ts$': [
        'ts-jest',
        {
            tsconfig: 'tsconfig.eslint.json'
        }
    ]
};
module.exports = config;
