// const config = require('../../jest.base');
// config.testEnvironment = 'jsdom';
//config.collectCoverageFrom = ['**/*.ts', '!**/index.ts'];
// config.preset = 'ts-jest';
// module.exports = config;
const config = require('../../jest.base');
config.testEnvironment = 'jsdom';
config.collectCoverageFrom = ['src/**/*.ts'];
config.transform = {
    '^.+\\.test.ts?$': 'ts-jest'
};
config.preset = 'ts-jest';
config.transformIgnorePatterns = ['<rootDir>/node_modules/'];
config.testMatch = ['**/test/unit/**/*.(test).ts(x)?'];
module.exports = config;
