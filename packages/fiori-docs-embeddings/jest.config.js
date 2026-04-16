import baseConfig from '../../jest.base.mjs';

export default {
    ...baseConfig,
    setupFiles: [], // Override base config - tests already import from @jest/globals
    modulePathIgnorePatterns: [...baseConfig.modulePathIgnorePatterns, '<rootDir>/test/data/', '<rootDir>/data/']
};
