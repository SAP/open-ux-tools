const config = require('../../jest.base');
config.modulePathIgnorePatterns.push('<rootDir>/test/abap/mockResponses/');
// Setup file to properly initialize nock for all tests
config.setupFilesAfterEnv = ['<rootDir>/test/setup.ts'];
module.exports = config;