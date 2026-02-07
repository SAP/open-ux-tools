const config = require('../../jest.base');
config.transformIgnorePatterns = ['<rootDir>/../../node_modules/(?!(mem-fs|mem-fs-editor)/)'];
module.exports = config;