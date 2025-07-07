const config = require('../../jest.base');
config.setupFilesAfterEnv = ['jest-extended/all', '@sap-ux/jest-file-matchers/dist/setup'];
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
config.modulePathIgnorePatterns = [
    ...config.modulePathIgnorePatterns,
    '<rootDir>/test/int/fiori-elements/expected-output',
    '<rootDir>/test/int/fiori-freestyle/expected-output',
    '<rootDir>/test/int/test-output'
];
module.exports = config;
