const config = require('../../jest.base');
config.coveragePathIgnorePatterns = [
    "src/preview/client"
];
module.exports = config;