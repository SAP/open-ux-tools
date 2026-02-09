const config = require('../../jest.base');
config.setupFilesAfterEnv = ['jest-extended/all'];
config.transformIgnorePatterns = ['<rootDir>/../../node_modules/(?!(mem-fs|mem-fs-editor)/)'];
module.exports = config;
