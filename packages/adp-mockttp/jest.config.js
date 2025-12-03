const config = require('../../jest.base');
config.displayName = 'adp-mockttp';
config.rootDir = './';
config.testMatch = ['<rootDir>/test/unit/**/*.test.(ts|js)'];
config.collectCoverageFrom = ['<rootDir>/src/**/*.ts', '!<rootDir>/src/index.ts'];
module.exports = config;
