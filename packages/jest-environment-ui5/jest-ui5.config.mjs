import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.testMatch = ['**/test/fixtures/**/?(*.)+(spec|test).[jt]s?(x)'];
config.collectCoverage = false;
config.testEnvironment = './src/index.js';
config.testEnvironmentOptions = {
    configPath: process.env.UI5_JEST_CONFIG || 'test/fixtures/ui5.yaml',
    shimManifests: true,
    force: true
};
export default config;
