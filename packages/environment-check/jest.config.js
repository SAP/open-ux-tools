const config = require('../../jest.base');
config.modulePathIgnorePatterns.push('<rootDir>/coverage');
config.setupFilesAfterEnv = ['<rootDir>/jest.setup.js'];
module.exports = config;