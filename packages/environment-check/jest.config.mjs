import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.modulePathIgnorePatterns.push('<rootDir>/coverage');
export default config;