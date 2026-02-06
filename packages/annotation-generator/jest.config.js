const config = require('../../jest.base');
config.globalSetup = './jest.setup.js';
config.testTimeout = 20001;
config.transformIgnorePatterns = ['<rootDir>/../../node_modules/(?!(mem-fs|mem-fs-editor)/)'];
module.exports = config;
