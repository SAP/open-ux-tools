const config = require('../../jest.base');
config.globalSetup = './jest.setup.js';
config.testTimeout = 20000;
module.exports = config;
