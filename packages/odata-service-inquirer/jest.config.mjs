import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.setupFilesAfterEnv = ['jest-extended/all'];
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
export default config;
