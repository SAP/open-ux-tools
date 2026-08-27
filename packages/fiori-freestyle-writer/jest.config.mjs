import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.moduleNameMapper = {
    ...baseConfig.moduleNameMapper,
    '^@vscode-logging/logger$': '<rootDir>/test/__mocks__/vscode-logging-logger.mjs'
};
config.transformIgnorePatterns = [
    'node_modules/(?!(@sap-ux|@sap-ux-private|@sap/ux-cds-compiler-facade|@vscode-logging)/)'
];
config.modulePathIgnorePatterns.push('<rootDir>/test/test-output');
config.modulePathIgnorePatterns.push('<rootDir>/templates');
export default config;
