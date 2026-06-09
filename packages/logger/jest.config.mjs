import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.setupFilesAfterEnv = ['jest-extended/all'];
config.modulePathIgnorePatterns.push('<rootDir>/test/test-output');
export default config;
