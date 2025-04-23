const config = require('../../jest.base');
config.modulePathIgnorePatterns.push('<rootDir>/test/test-output');
config.modulePathIgnorePatterns.push('<rootDir>/templates');
config.transform['^.+\\.ejs$'] = '<rootDir>/jest-text-transformer.js';
module.exports = config;
