import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.testEnvironment = 'jsdom';
config.collectCoverageFrom = ['**/*.ts', '!**/index.ts'];
config.preset = 'ts-jest';
export default config;
