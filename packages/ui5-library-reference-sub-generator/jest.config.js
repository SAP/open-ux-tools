const config = require('../../jest.base');
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
config.transformIgnorePatterns = ['<rootDir>/../../node_modules/(?!(mem-fs|mem-fs-editor)/)'];
module.exports = config;
