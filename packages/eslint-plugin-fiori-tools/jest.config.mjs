import baseConfig from '../../jest.base.mjs';
export default {
    ...config,
    // Coverage is handled by c8 wrapper for worker thread support
    collectCoverage: false,
    setupFiles: ['<rootDir>/test/global-setup.ts']
}
