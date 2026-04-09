import baseConfig from '../../jest.base.mjs';

export default {
    ...baseConfig,
    setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
    modulePathIgnorePatterns: [...baseConfig.modulePathIgnorePatterns, '<rootDir>/test/data/'],
    transformIgnorePatterns: ['node_modules/(?!@xenova)'],
    moduleNameMapper: {
        // External @sap-ux packages not in workspace — resolve before generic mapper
        '^@sap-ux/edmx-parser$': '<rootDir>/node_modules/@sap-ux/edmx-parser/dist/index.js',
        '^@sap-ux/annotation-converter$': '<rootDir>/node_modules/@sap-ux/annotation-converter/dist/index.js',
        '^@sap-ux/vocabularies-types(.*)$': '<rootDir>/node_modules/@sap-ux/vocabularies-types$1',
        // Workspace package without src/index.ts
        '^@sap-ux/fiori-docs-embeddings$': '<rootDir>/../fiori-docs-embeddings/index.js',
        // CJS package that requires ESM workspace packages — mock to prevent cascading errors
        '^@sap/ux-cds-compiler-facade$': '<rootDir>/test/__mocks__/@sap/ux-cds-compiler-facade.cjs',
        ...baseConfig.moduleNameMapper,
        '^@lancedb/lancedb$': '<rootDir>/test/__mocks__/@lancedb/lancedb.cjs',
        '^@xenova/transformers$': '<rootDir>/test/__mocks__/@xenova/transformers.cjs'
    }
};
