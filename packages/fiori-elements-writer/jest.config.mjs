import baseConfig from '../../jest.base.mjs';
const config = {
    ...baseConfig,
    resolver: '<rootDir>/jest.resolver.cjs'
};
config.modulePathIgnorePatterns.push('<rootDir>/test/test-output');
config.modulePathIgnorePatterns.push('<rootDir>/templates');
export default config;
