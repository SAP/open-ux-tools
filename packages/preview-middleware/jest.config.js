const config = require('../../jest.base');
config.modulePathIgnorePatterns.push('<rootDir>/test/test-output');
config.modulePathIgnorePatterns.push('<rootDir>/.tmp');
config.testMatch = ['<rootDir>/test/**/*.test.ts'];
// adding dummy comment
module.exports = config;
