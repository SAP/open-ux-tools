const config = require('../../jest.base');
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
module.exports = config;
