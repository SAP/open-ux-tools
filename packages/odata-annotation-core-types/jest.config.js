const config = require('../../jest.base');
config.globals = {
    'ts-jest': {
        tsconfig: 'tsconfig-test.json'
    }
};
config.testRegex = 'test/.*\\.test\\.ts$';
config.testPathIgnorePatterns = ['<rootDir>/node_modules/', '<rootDir>/dist/'];
config.reporters.push('summary');
// config.testResultsProcessor = 'jest-sonar-reporter';

module.exports = config;

