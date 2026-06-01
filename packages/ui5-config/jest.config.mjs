import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.modulePathIgnorePatterns.push('<rootDir>/test/test-output');
export default config;
