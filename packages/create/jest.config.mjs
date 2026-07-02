import baseConfig from '../../jest.base.mjs';

const config = {
    ...baseConfig,
    // Map chalk to ESM shim since chalk 5.x doesn't provide named ESM exports
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        '^chalk$': '<rootDir>/test/__mocks__/chalk.ts'
    }
};

export default config;
