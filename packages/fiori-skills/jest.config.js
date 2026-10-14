const config = require('../../jest.base');
// Exclude CLI entry shim from coverage — it is tested via bin invocation, not unit tests
config.coveragePathIgnorePatterns = ['<rootDir>/src/index.ts'];
module.exports = config;
