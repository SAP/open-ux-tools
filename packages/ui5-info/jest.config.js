const config = require('../../jest.base');
config.collectCoverage = false;
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};

module.exports = config;
