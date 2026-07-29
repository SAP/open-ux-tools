import { join } from 'node:path';

// Constants
export const FIORI_TOOLS_PROXY = 'fiori-tools-proxy';
export const FIORI_TOOLS_APPRELOAD = 'fiori-tools-appreload';
export const legacyPath = join('src', 'main');
export const disableCacheParam = 'sap-ui-xx-viewCache=false';

//todo: reference instead of replicating
export const devDependencies: {
    [key: string]: string;
} = {
    '@ui5/cli': '^4.0.0',
    '@sap/ux-ui5-tooling': '1',
    rimraf: '6.0.1'
};
export const ui5Dependencies = ['@sap/ux-ui5-tooling'];
export const v4MockServerDep = {
    '@sap-ux/ui5-middleware-fe-mockserver': '2'
};

// Re-export from template-maps
export {
    packageJsonTmplName,
    propertyEditorTaskProjectTypes,
    getBaseTemplatesMap,
    getFLPSandboxTemplatesMap,
    getFLPSandboxMockServerTemplatesMap,
    getCommonV4TemplatesMap,
    getSapTemplatesMap,
    getFeTemplatesMap,
    getAdaptationTemplatesMap,
    getLibraryTemplatesMap,
    getFFTestSuiteMap
} from './template-maps.js';

// Re-export from project-discovery
export {
    findAllWebIDEProjectFolders,
    getWebIDEProjectPathsAsLabels,
    findProjectsByManifest
} from './project-discovery.js';

// Re-export from file-system-utils
export {
    stripSpaces,
    escapeSingleQuotes,
    escapeDoubleQuotes,
    doesDirectoryExists,
    doesPropertyExist,
    createDirectory
} from './file-system-utils.js';

// Re-export from manifest-and-version-utils
export {
    getUI5Version,
    checkManifestUI5Version,
    readManifest,
    isAppFreestyle,
    isGenerateIndex
} from './manifest-and-version-utils.js';

// Re-export from migration-utils
export {
    generateSapLibsStr,
    MigrationError,
    determineMessage,
    generateTemplate,
    getSourceTemplate,
    generateToolsId,
    determineSapUxLayer,
    buildSapClientParam,
    buildUrlParam
} from './migration-utils.js';
