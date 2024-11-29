const config = require('../../jest.base');
config.testMatch = ['**/test/unit/?(*.)+(spec|test).[jt]s?(x)'];
config.collectCoverageFrom = ['src/**/*.js'];
config.collectCoverage = true;
config.setupFilesAfterEnv = ['<rootDir>/jest.setup.js'];
module.exports = config;
