import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
config.moduleNameMapper = {
    ...config.moduleNameMapper,
    '^@sap-devx/yeoman-ui-types$': '<rootDir>/node_modules/@sap-devx/yeoman-ui-types/dist/cjs/src/index.js'
};
export default config;
