const config = require('../../jest.base');
config.globals = {
    'ts-jest': {
        tsconfig: 'tsconfig-test.json'
    }
};
// config.testResultsProcessor =  'jest-sonar-reporter';
config.coverageDirectory.push('reports/test/unit/coverage');
config.modulePathIgnorePatterns.push('<rootDir>/test/test-output');
config.modulePathIgnorePatterns.push('<rootDir>/templates');
config.testPathIgnorePatterns = ['<rootDir>/node_modules/', '<rootDir>/dist/'];
config.reporters.push('summary');
module.exports = config;
