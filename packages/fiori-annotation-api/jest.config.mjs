import baseConfig from '../../jest.base.mjs';

const config = {
    ...baseConfig,
    globalSetup: './jest.setup.cjs',
    testTimeout: 20001,
    resolver: '<rootDir>/jest.resolver.cjs'
};

export default config;
