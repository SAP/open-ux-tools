const config = require('../../jest.base');
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
config.collectCoverage = false;
module.exports = config;
