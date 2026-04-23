import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.setupFilesAfterEnv = ['jest-extended/all', '@sap-ux/jest-file-matchers/dist/setup'];
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
config.moduleNameMapper = {
    '@sap-devx/yeoman-ui-types': '<rootDir>/node_modules/@sap-devx/yeoman-ui-types/dist/cjs/src/index.js',
    ...baseConfig.moduleNameMapper,
    '^@sap/ux-cds-compiler-facade$': '<rootDir>/test/__mocks__/@sap/ux-cds-compiler-facade.ts',
    '^@vscode-logging/logger$': '<rootDir>/test/__mocks__/@vscode-logging/logger.ts'
};
config.modulePathIgnorePatterns = [
    ...config.modulePathIgnorePatterns,
    '<rootDir>/test/int/fiori-elements/expected-output',
    '<rootDir>/test/int/fiori-freestyle/expected-output',
    '<rootDir>/test/int/test-output'
];
export default config;
