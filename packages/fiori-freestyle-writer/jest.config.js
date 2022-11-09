const config = require('../../jest.base');
config.coverageReporters = ['text', ['lcov', { projectRoot: '../../' }]];
config.modulePathIgnorePatterns.push('<rootDir>/test/test-output');
config.modulePathIgnorePatterns.push('<rootDir>/templates');
config.modulePathIgnorePatterns.push('<rootDir>/coverage');
module.exports = config;
