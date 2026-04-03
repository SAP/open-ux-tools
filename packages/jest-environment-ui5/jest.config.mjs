import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.testMatch = ['**/test/unit/?(*.)+(spec|test).[jt]s?(x)'];
config.collectCoverageFrom = ['src/**/*.js'];
config.collectCoverage = true;
export default config;
