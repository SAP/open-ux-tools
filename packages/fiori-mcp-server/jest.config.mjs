import baseConfig from '../../jest.base.mjs';

export default {
    ...baseConfig,
    setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
    modulePathIgnorePatterns: [...baseConfig.modulePathIgnorePatterns, '<rootDir>/test/data/'],
    transformIgnorePatterns: ['<rootDir>/node_modules/(?!@xenova)'],
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        '^@lancedb/lancedb$': '<rootDir>/test/__mocks__/@lancedb/lancedb.js',
        '^@xenova/transformers$': '<rootDir>/test/__mocks__/@xenova/transformers.js'
    }
};
