const config = require('../../jest.base');
module.exports = {
    ...config,
    // Coverage is handled by c8 wrapper for worker thread support
    collectCoverage: false,
    setupFiles: ['<rootDir>/test/global-setup.ts']
    // TODO: investigate OOM on Node 20 arm64 after test run
}
