import baseConfig from '../../jest.base.mjs';

const config = {
    ...baseConfig,
    // Map chalk to ESM shim since chalk 4.x is CJS and doesn't provide named ESM exports
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^chalk$': '<rootDir>/test/__mocks__/chalk.ts'
    }
};

export default config;
