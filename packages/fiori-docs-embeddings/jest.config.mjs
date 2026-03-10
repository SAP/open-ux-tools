import config from '../../jest.base.js';

export default {
    ...config,
    modulePathIgnorePatterns: [...config.modulePathIgnorePatterns, '<rootDir>/test/data/', '<rootDir>/data/'],
    // Exclude files with import.meta from coverage (they use ESM features)
    collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/scripts/build-embeddings.ts']
};
