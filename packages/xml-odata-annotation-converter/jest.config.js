const config = require('../../jest.base');

config.preset = 'ts-jest';
config.testEnvironment = 'node';
config.globals = {
    'ts-jest': {
        tsconfig: 'tsconfig-test.json'
    }
};
config.testRegex = 'test/.*\\.test\\.ts$';
config.testPathIgnorePatterns = ['<rootDir>/node_modules/', '<rootDir>/dist/'];
config.reporters.push('summary');

module.exports = config;

