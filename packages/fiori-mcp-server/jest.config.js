const config = require('../../jest.base');
module.exports = {
    ...config,
    setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
    modulePathIgnorePatterns: [...config.modulePathIgnorePatterns, '<rootDir>/test/data/'],
    transformIgnorePatterns: ['<rootDir>/node_modules/(?!@sap-ux/semantic-search|@sap-ux/fiori-docs-embeddings|mem-fs|mem-fs-editor)'],
    moduleNameMapper: {
        '^@sap-ux/semantic-search$': '<rootDir>/test/__mocks__/@sap-ux/semantic-search.js',
        '^@sap-ux/fiori-docs-embeddings$': '<rootDir>/test/__mocks__/@sap-ux/fiori-docs-embeddings.js'
    }
};
