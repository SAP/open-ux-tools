import baseConfig from '../../jest.base.mjs';

export default {
    ...baseConfig,
    modulePathIgnorePatterns: [...baseConfig.modulePathIgnorePatterns, '<rootDir>/test/data/', '<rootDir>/data/']
};
