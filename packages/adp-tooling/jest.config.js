const config = require('../../jest.base');
config.setupFilesAfterEnv = ['<rootDir>/jest.setup.js'];
module.exports = config;
