import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
config.moduleNameMapper = {
    ...config.moduleNameMapper,
    '^vscode$': '<rootDir>/test/__mocks__/vscode.js'
};
export default config;
