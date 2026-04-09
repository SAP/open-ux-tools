import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.setupFilesAfterEnv = ['jest-extended/all'];
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
config.moduleNameMapper = {
    ...baseConfig.moduleNameMapper,
    '^@vscode-logging/logger$': '<rootDir>/test/__mocks__/@vscode-logging/logger.ts',
    '^@sap/ux-cds-compiler-facade$': '<rootDir>/test/__mocks__/@sap/ux-cds-compiler-facade.ts'
};
export default config;
