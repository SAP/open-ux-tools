import baseConfig from '../../jest.base.mjs';
const config = {
    ...baseConfig,
    // Redirect CJS require() calls for ESM packages from @sap/ux-cds-compiler-facade
    // to pre-bundled CJS proxy files, avoiding CJS/ESM interop issues
    resolver: '<rootDir>/jest.resolver.cjs'
};
config.globalSetup = './jest.setup.mjs';
config.testTimeout = 20001;
export default config;
