const config = require('../../jest.base');
config.testMatch = ['**/test/fixtures/**/?(*.)+(spec|test).[jt]s?(x)'];
config.collectCoverage = false;
config.testEnvironment = './src/index.js';
config.testEnvironmentOptions = {
    configPath: process.env.UI5_JEST_CONFIG || 'test/fixtures/ui5.yaml',
    force: true
};
module.exports = config;
