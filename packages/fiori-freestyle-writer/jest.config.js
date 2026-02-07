const config = require('../../jest.base');
config.modulePathIgnorePatterns.push('<rootDir>/test/test-output');
config.modulePathIgnorePatterns.push('<rootDir>/templates');
config.transformIgnorePatterns = ['<rootDir>/../../node_modules/(?!(mem-fs|mem-fs-editor)/)'];
module.exports = config;
