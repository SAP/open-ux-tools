import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.moduleNameMapper = {
    ...baseConfig.moduleNameMapper,
    '^@vscode-logging/logger$': '<rootDir>/test/__mocks__/vscode-logging-logger.js'
};
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
export default config;
