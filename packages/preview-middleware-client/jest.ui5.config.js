const { resolve } = require('path');
const config = require('../../jest.base');
config.testEnvironment = '@sap-ux/jest-environment-ui5';
config.testEnvironmentOptions = {
    // mappingStrategy: 'tsconfig',
    // configPath: resolve(__dirname, 'tsconfig.eslint.json'),
    // rootFolder: __dirname,
    configPath: 'ui5-test.yaml',
    force: true
};
config.modulePathIgnorePatterns = config.modulePathIgnorePatterns.filter((pattern) => pattern !== '<rootDir>/test/integration');
// config.moduleNameMapper = {
//     '^sap/(.+)$': '<rootDir>/test/__mock__/sap/$1.ts',
//     // Jest will try to load browser version, because environment is set to jsdom, but that is not what we want
//     // https://jest-archive-august-2023.netlify.app/docs/28.x/upgrading-to-jest28#packagejson-exports
//     '^@sap-ux/i18n$': require.resolve('@sap-ux/i18n'),
//     '^mock/(.+)$': '<rootDir>/test/__mock__/$1.ts',
//     '^open/ux/preview/client/(.+)$': '<rootDir>/src/$1.ts'
// };
config.transform = {
    '^.+\\.ts$': ['babel-jest', { configFile: resolve(__dirname, '.babelrc.json') }]
};

module.exports = config;
