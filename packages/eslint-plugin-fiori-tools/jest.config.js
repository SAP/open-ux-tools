const config = require('../../jest.base');
module.exports = {
    ...config,
    // Coverage is handled by c8 wrapper for worker thread support
    collectCoverage: false,
    setupFiles: ['<rootDir>/test/global-setup.ts'],
    transformIgnorePatterns: ['<rootDir>/../../node_modules/(?!(mem-fs|mem-fs-editor)/)']  
}
