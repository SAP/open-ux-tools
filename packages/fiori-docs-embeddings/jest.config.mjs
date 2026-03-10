import config from '../../jest.base.js';

export default {
    ...config,
    modulePathIgnorePatterns: [...config.modulePathIgnorePatterns, '<rootDir>/test/data/', '<rootDir>/data/']
};
