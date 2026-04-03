import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.modulePathIgnorePatterns.push('<rootDir>/test/test-output');
config.modulePathIgnorePatterns.push('<rootDir>/.tmp');
config.testMatch = ['<rootDir>/test/**/*.test.ts'];
export default config;
