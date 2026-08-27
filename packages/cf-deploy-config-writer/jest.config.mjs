import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.moduleNameMapper = {
    ...config.moduleNameMapper,
    '^hasbin$': '<rootDir>/test/__mocks__/hasbin.mjs'
};
config.transformIgnorePatterns = [
    'node_modules/(?!(@sap-ux|@sap-ux-private|@sap/ux-cds-compiler-facade|hasbin|unionfs|memfs)/)'
];
config.testTimeout = 15000;
config.setupFiles = ['<rootDir>/test/jest.setup.mjs'];
export default config;
