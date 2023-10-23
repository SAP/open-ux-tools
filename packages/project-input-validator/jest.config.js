const config = require('../../jest.base');
config.setupFilesAfterEnv = ['jest-extended/all'];
config.collectCoverage = false;
module.exports = config;
