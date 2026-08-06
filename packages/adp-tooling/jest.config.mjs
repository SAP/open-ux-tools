import baseConfig from '../../jest.base.mjs';
import { resolve } from 'node:path';
const __dirname = import.meta.dirname;

// External @sap-ux packages not in workspace — must be excluded from source mapping
const externalSapUx =
    'adp-flp-config|annotation-converter|cards-editor-middleware|control-property-editor-sources|edmx-converter|edmx-parser|fiori-tools|odata-download-sub-generator|ui5-middleware-fe-mockserver|vocabularies|vocabularies-types';

export default {
    ...baseConfig,
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        // Map workspace packages to their TypeScript source so they go through ts-jest
        // and jest.unstable_mockModule() can intercept them
        [`^@sap-ux/(?!${externalSapUx})([^/]+)$`]: resolve(__dirname, '../$1/src/index.ts'),
        '^@sap-ux-private/([^/]+)$': resolve(__dirname, '../$1/src/index.ts'),
        // Map relative src paths to absolute paths for jest.mock() resolution
        '^(\\.\\.[\\/])+src[\\/](.*)$': resolve(__dirname, 'src/$2'),
        '^@ui5/task-adaptation/dist/index\\.js$': resolve(__dirname, '../../node_modules/.pnpm/@ui5+task-adaptation@1.6.7_buffer@6.0.3_typescript@5.9.3/node_modules/@ui5/task-adaptation/dist/index.js')
    }
};
