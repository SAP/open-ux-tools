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

// module.exports = {
//     testResultsProcessor: 'jest-sonar-reporter',
//     moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node', 'd.ts'],
//     coverageDirectory: 'reports/test/unit/coverage',

//     reporters: [
//         'default',
//         'summary',
//         ['jest-junit', { outputDirectory: 'reports/test/unit', outputName: 'junit-report.xml' }]
//     ]
// };
