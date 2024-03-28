const config = require('../../jest.base');
config.modulePathIgnorePatterns.push('<rootDir>/test/test-output');
module.exports = config;
