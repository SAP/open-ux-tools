const config = require('../../jest.base');
config.modulePathIgnorePatterns.push('<rootDir>/coverage');
config.transformIgnorePatterns = ['<rootDir>/../../node_modules/(?!(mem-fs|mem-fs-editor)/)'];
module.exports = config;