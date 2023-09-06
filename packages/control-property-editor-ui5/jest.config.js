const config = require('../../jest.base');
config.testEnvironment = 'jsdom';
config.collectCoverageFrom = ['src/**/*.ts', '!src/index.ts', '!src/changes/index.ts'];
config.transform = {
    '^.+\\.test.ts?$': 'ts-jest'
};
config.preset = 'ts-jest';
config.transformIgnorePatterns = ['<rootDir>/node_modules/'];
config.testMatch = ['**/test/unit/**/*.(test).ts(x)?'];
config.setupFiles = ['<rootDir>/setup-mock.js'];
module.exports = config;
