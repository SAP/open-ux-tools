const config = require('../../jest.base');
config.setupFilesAfterEnv = ['jest-extended/all'];
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
module.exports = config;
