import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
config.moduleNameMapper = {
    ...config.moduleNameMapper,
    '^chalk$': '<rootDir>/test/__mocks__/chalk.cjs',
    '^prompts$': '<rootDir>/test/__mocks__/prompts.cjs'
};
config.transformIgnorePatterns = [
    'node_modules/(?!(@sap-ux|@sap-ux-private|@sap/ux-cds-compiler-facade|chalk)/)'
];
export default config;
