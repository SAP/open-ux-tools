import baseConfig from '../../jest.base.mjs';
export default {
    ...baseConfig,
    // coverageProvider: 'v8' overrides jest.base default ('babel'); collectCoverage: true is inherited from jest.base
    coverageProvider: 'v8',
    setupFiles: ['<rootDir>/test/global-setup.ts'],
    resolver: '<rootDir>/jest.resolver.cjs',
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        // Mock synckit to prevent worker thread deadlock in Jest ESM mode.
        // createSyncFn spawns worker threads that use SharedArrayBuffer + Atomics.wait()
        // which deadlocks under Jest's --experimental-vm-modules.
        '^synckit$': '<rootDir>/test/__mocks__/synckit.cjs'
    }
};
