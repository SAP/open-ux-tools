const config = require('../../jest.base');
config.modulePathIgnorePatterns.push('<rootDir>/test/test-output');
config.modulePathIgnorePatterns.push('<rootDir>/templates');
config.transform['^.+\\.ejs$'] = 'jest-text-transformer';
module.exports = config;
