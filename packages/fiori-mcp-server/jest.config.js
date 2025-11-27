const config = require('../../jest.base');
module.exports = {
    ...config,
    modulePathIgnorePatterns: [...config.modulePathIgnorePatterns, '<rootDir>/test/data/'],
    transformIgnorePatterns: ['<rootDir>/node_modules/(?!@xenova)'],
    transform: {
        ...config.transform,
        '\\.md$': '<rootDir>/test/__mocks__/markdown-transform.js'
    },
    moduleNameMapper: {
        '^@lancedb/lancedb$': '<rootDir>/test/__mocks__/@lancedb/lancedb.js',
        '^@xenova/transformers$': '<rootDir>/test/__mocks__/@xenova/transformers.js'
    }
};
