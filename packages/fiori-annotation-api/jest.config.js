const config = require('../../jest.base');
config.globalSetup = './jest.setup.js';
config.testTimeout = 60000;
module.exports = config;
