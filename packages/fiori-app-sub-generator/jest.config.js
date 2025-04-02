const config = require('../../jest.base');
config.setupFilesAfterEnv = ['jest-extended/all', '@sap-ux/jest-file-matchers/dist/setup'];
config.collectCoverage = false;
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
}
module.exports = config;
