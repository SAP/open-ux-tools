const config = require('../../jest.base');
config.setupFilesAfterEnv = ['jest-extended/all'];
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
config.collectCoverage = false;
module.exports = config;
