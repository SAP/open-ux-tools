import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.moduleNameMapper = {
    ...baseConfig.moduleNameMapper,
    '^@vscode-logging/logger$': '<rootDir>/test/__mocks__/vscode-logging-logger.js'
};
config.modulePathIgnorePatterns.push('<rootDir>/test/test-output');
config.modulePathIgnorePatterns.push('<rootDir>/templates');
export default config;
