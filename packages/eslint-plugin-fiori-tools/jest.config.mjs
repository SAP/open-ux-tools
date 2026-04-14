import baseConfig from '../../jest.base.mjs';
export default {
    ...baseConfig,
    // Coverage is handled by c8 wrapper for worker thread support
    collectCoverage: false,
    setupFiles: ['<rootDir>/test/global-setup.mjs'],
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        // Mock synckit to prevent worker thread deadlock in Jest ESM mode.
        // createSyncFn spawns worker threads that use SharedArrayBuffer + Atomics.wait()
        // which deadlocks under Jest's --experimental-vm-modules.
        '^synckit$': '<rootDir>/test/__mocks__/synckit.cjs',
        // Mock @sap/ux-cds-compiler-facade (CJS) to avoid its require() of ESM workspace packages
        // (odata-annotation-core-types, odata-annotation-core, project-access)
        '^@sap/ux-cds-compiler-facade$': '<rootDir>/test/__mocks__/ux-cds-compiler-facade.mjs'
    }
}
