import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
config.moduleNameMapper = {
    '@sap-devx/yeoman-ui-types': '<rootDir>/node_modules/@sap-devx/yeoman-ui-types/dist/cjs/src/index.js',
    ...config.moduleNameMapper,
    '^@vscode-logging/logger$': '<rootDir>/test/__mocks__/vscode-logging-logger.mjs'
};
config.transformIgnorePatterns = [
    'node_modules/(?!(@sap-ux|@sap-ux-private|@sap/ux-cds-compiler-facade|@vscode-logging)/)'
];
export default config;
