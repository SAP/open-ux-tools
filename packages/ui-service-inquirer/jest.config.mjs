import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.moduleNameMapper = {
    ...baseConfig.moduleNameMapper,
    '^@vscode-logging/logger$': '<rootDir>/test/__mocks__/vscode-logging-logger.mjs',
    '^@sap-devx/yeoman-ui-types$': '<rootDir>/node_modules/@sap-devx/yeoman-ui-types/dist/cjs/src/index.js'
};
config.transformIgnorePatterns = [
    'node_modules/(?!(@sap-ux|@sap-ux-private|@sap/ux-cds-compiler-facade|@vscode-logging)/)'
];
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
export default config;
