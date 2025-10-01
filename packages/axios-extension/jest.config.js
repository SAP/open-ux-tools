const config = require('../../jest.base');
config.modulePathIgnorePatterns.push('<rootDir>/test/abap/mockResponses/');
module.exports = config;