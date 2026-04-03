import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
export default config;
