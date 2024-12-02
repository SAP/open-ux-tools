const config = require('../../jest.base');
config.modulePathIgnorePatterns.push('<rootDir>/coverage');
config.setupFilesAfterEnv = ['../../jest.setup.js'];
module.exports = config;