const config = require('../../jest.base');
config.setupFilesAfterEnv = ['jest-extended/all'];
config.modulePathIgnorePatterns.push('<rootDir>/test/test-output');
module.exports = config;
