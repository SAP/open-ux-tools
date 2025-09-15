const config = require('../../jest.base');
config.modulePathIgnorePatterns.push('<rootDir>/test/abap/mockResponses/');
config.collectCoverage = false;
module.exports = config;