import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
config.moduleNameMapper = {
    ...config.moduleNameMapper,
    '^@vscode-logging/logger$': '<rootDir>/test/__mocks__/vscode-logging-logger.mjs'
};
config.transformIgnorePatterns = [
    'node_modules/(?!(@sap-ux|@sap-ux-private|@sap/ux-cds-compiler-facade|@vscode-logging)/)'
];
config.testTimeout = 15000;
export default config;
