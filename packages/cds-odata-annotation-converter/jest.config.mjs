import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.globalSetup = './jest.setup.js';
export default config;
