const config = require('../../jest.base');
config.setupFilesAfterEnv = ['jest-extended/all', '@sap-ux/jest-file-matchers/dist/setup'];
config.collectCoverage = true;
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
config.modulePathIgnorePatterns = [
    ...config.modulePathIgnorePatterns,
    '<rootDir>/test/int/fiori-elements/expected-output',
    '<rootDir>/test/int/fiori-freestyle/expected-output'
];
module.exports = config;
