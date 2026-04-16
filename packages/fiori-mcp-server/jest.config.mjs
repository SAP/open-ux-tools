import baseConfig from '../../jest.base.mjs';

export default {
    ...baseConfig,
    setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
    modulePathIgnorePatterns: [...baseConfig.modulePathIgnorePatterns, '<rootDir>/test/data/'],
    transformIgnorePatterns: ['node_modules/(?!(@xenova|@sap-ux|@sap-ux-private|@sap/ux-specification|@sap/ux-cds-compiler-facade)/)'],
    moduleNameMapper: {
        // External @sap-ux packages not in workspace — resolve before generic mapper
        '^@sap-ux/edmx-parser$': '<rootDir>/node_modules/@sap-ux/edmx-parser/dist/index.js',
        '^@sap-ux/annotation-converter$': '<rootDir>/node_modules/@sap-ux/annotation-converter/dist/index.js',
        '^@sap-ux/vocabularies-types(.*)$': '<rootDir>/node_modules/@sap-ux/vocabularies-types$1',
        // Workspace ESM packages — map to published CJS dist to avoid "Must use import to load ES Module" errors
        '^@sap-ux/odata-annotation-core-types$':
            '<rootDir>/../../node_modules/.pnpm/@sap-ux+odata-annotation-core-types@0.5.6/node_modules/@sap-ux/odata-annotation-core-types/dist/index.js',
        '^@sap-ux/text-document-utils$':
            '<rootDir>/../../node_modules/.pnpm/@sap-ux+text-document-utils@0.3.3/node_modules/@sap-ux/text-document-utils/dist/index.js',
        '^@sap-ux/odata-entity-model$':
            '<rootDir>/../../node_modules/.pnpm/@sap-ux+odata-entity-model@0.3.6/node_modules/@sap-ux/odata-entity-model/dist/index.js',
        // Workspace package without src/index.ts
        '^@sap-ux/fiori-docs-embeddings$': '<rootDir>/../fiori-docs-embeddings/index.js',
        // CJS packages — use .cjs wrappers so Jest ESM mode can extract named exports
        '^@sap/ux-cds-compiler-facade$': '<rootDir>/test/__mocks__/@sap/ux-cds-compiler-facade.cjs',
        '^@sap/ux-specification$': '<rootDir>/test/__mocks__/@sap/ux-specification.mjs',
        ...baseConfig.moduleNameMapper,
        '^@lancedb/lancedb$': '<rootDir>/test/__mocks__/@lancedb/lancedb.cjs',
        '^@xenova/transformers$': '<rootDir>/test/__mocks__/@xenova/transformers.cjs'
    }
};
