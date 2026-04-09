import baseConfig from '../../jest.base.mjs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// External @sap-ux packages not in workspace — must be excluded from source mapping
const externalSapUx = 'adp-flp-config|annotation-converter|cards-editor-middleware|control-property-editor-sources|edmx-converter|edmx-parser|fiori-tools|odata-download-sub-generator|ui5-middleware-fe-mockserver|vocabularies|vocabularies-types';

export default {
    ...baseConfig,
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        // Map workspace packages to their TypeScript source so they go through ts-jest
        // and jest.unstable_mockModule() can intercept them
        [`^@sap-ux/(?!${externalSapUx})(.+)$`]: resolve(__dirname, '../$1/src/index.ts'),
        '^@sap-ux-private/(.+)$': resolve(__dirname, '../$1/src/index.ts'),
        // Map relative src paths to absolute paths for jest.mock() resolution
        '^(\\.\\.[\\/])+src[\\/](.*)$': resolve(__dirname, 'src/$2')
    }
};
