import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.globalSetup = './jest.setup.js';
config.testTimeout = 20001;
export default config;
