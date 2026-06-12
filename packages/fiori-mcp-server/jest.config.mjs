import baseConfig from '../../jest.base.mjs';

export default {
    ...baseConfig,
    setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
    modulePathIgnorePatterns: [...baseConfig.modulePathIgnorePatterns, '<rootDir>/test/data/'],
    transformIgnorePatterns: [
        'node_modules/(?!(@huggingface|@sap-ux|@sap-ux-private|@sap/ux-specification|@sap/ux-cds-compiler-facade)/)'
    ],
    // Routes @sap/ux-cds-compiler-facade to .mjs ESM mock
    resolver: '<rootDir>/jest.resolver.cjs',
    moduleNameMapper: {
        // External @sap-ux packages not in workspace — resolve before generic mapper
        '^@sap-ux/edmx-parser$': '<rootDir>/node_modules/@sap-ux/edmx-parser/dist/index.js',
        '^@sap-ux/annotation-converter$': '<rootDir>/node_modules/@sap-ux/annotation-converter/dist/index.js',
        '^@sap-ux/vocabularies-types(.*)$': '<rootDir>/node_modules/@sap-ux/vocabularies-types$1',
        // Workspace ESM packages — map to published CJS dist to avoid "Must use import to load ES Module" errors
        '^@sap-ux/odata-annotation-core-types$':
            '<rootDir>/../odata-annotation-core-types/dist/index.js',
        '^@sap-ux/text-document-utils$': '<rootDir>/../text-document-utils/dist/index.js',
        '^@sap-ux/odata-entity-model$': '<rootDir>/../odata-entity-model/dist/index.js',
        // Workspace package without src/index.ts
        '^@sap-ux/fiori-docs-embeddings$': '<rootDir>/../fiori-docs-embeddings/index.js',
        // Stub fe-fpm-writer to prevent the CJS require chain: ux-specification → fe-fpm-writer →
        // fiori-annotation-api → @sap/ux-cds-compiler-facade which conflicts with the ESM mock
        '^@sap-ux/fe-fpm-writer$': '<rootDir>/test/__mocks__/@sap-ux/fe-fpm-writer.cjs',
        '^@sap/ux-specification$': '<rootDir>/test/__mocks__/@sap/ux-specification.mjs',
        ...baseConfig.moduleNameMapper,
        '^@huggingface/transformers$': '<rootDir>/test/__mocks__/@huggingface/transformers.cjs'
    }
};
