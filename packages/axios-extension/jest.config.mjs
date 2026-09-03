import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.modulePathIgnorePatterns.push('<rootDir>/test/abap/mockResponses/');
// Setup file to properly initialize nock for all tests
config.setupFilesAfterEnv = ['<rootDir>/test/setup.ts'];
export default config;