const config = require('../../jest.base');
// Ensure mem-fs packages are transformed from ESM to CJS
config.transformIgnorePatterns = ['<rootDir>/../../node_modules/(?!(mem-fs|mem-fs-editor)/)'];
module.exports = config;
    