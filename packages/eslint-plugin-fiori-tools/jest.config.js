const config = require('../../jest.base');
module.exports = {
    ...config,
    // coverageProvider: 'v8' overrides jest.base default ('babel'); collectCoverage: true is inherited from jest.base
    coverageProvider: 'v8',
    setupFiles: ['<rootDir>/test/global-setup.ts']
    // TODO: investigate OOM on Node 20 arm64 after test run
}
