const config = require('../../jest.base');
config.testEnvironment = 'jsdom';
config.collectCoverageFrom = ['**/*.ts', '!**/index.ts'];
config.preset = 'ts-jest';
module.exports = config;
