const config = require('../../jest.base');
config.globalSetup = './jest.setup.js';
config.testTimeout = 20001;
module.exports = config;
