const config = require('../../jest.base');
config.testEnvironment = 'jsdom';
config.moduleNameMapper = {
    '^sap/(.+)$': '<rootDir>/test/__mock__/sap/$1.ts',
    // Jest will try to load browser version, because environment is set to jsdom, but that is not what we want
    // https://jest-archive-august-2023.netlify.app/docs/28.x/upgrading-to-jest28#packagejson-exports
    '^@sap-ux/i18n$': require.resolve('@sap-ux/i18n'),
    // same as above, starting 1.0.11 "exports" property is added in package.json
    'vscode-languageserver-textdocument': require.resolve('vscode-languageserver-textdocument'),
    '^mock/(.+)$': '<rootDir>/test/__mock__/$1.ts',
    '^open/ux/preview/client/(.+)$': '<rootDir>/src/$1.ts'
};
config.transform = {
    '^.+\\.ts$': [
        'ts-jest',
        {
            tsConfig: 'tsconfig.eslint.json'
        }
    ]
};
config.setupFilesAfterEnv = ['<rootDir>/test/global.mock.ts'];
module.exports = config;
