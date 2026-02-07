const config = require('../../jest.base');
config.testMatch = ['**/test/unit/?(*.)+(spec|test).[jt]s?(x)'];
config.collectCoverageFrom = ['src/**/*.js'];
config.collectCoverage = true;
config.transformIgnorePatterns = ['<rootDir>/../../node_modules/(?!(mem-fs|mem-fs-editor)/)'];
module.exports = config;
