import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Template constants - replaces @sap/ux-app-templates
const currentDir = dirname(fileURLToPath(import.meta.url));

export const enum TemplateFileName {
    AppSettings = 'app-settings',
    SAPApp = 'sap-app-settings',
    AppToApp = 'app-to-app',
    Test = 'test',
    Utils = 'utils',
    Npmrc = '.npmrc',
    GitIgnore = '.gitignore',
    UI5Yaml = 'ui5.yaml',
    UI5LocalYaml = 'ui5-local.yaml',
    UI5MockYaml = 'ui5-mock.yaml',
    FLPSandbox = 'flpSandbox.html',
    ChangesPreview = 'changes_preview.js',
    ChangesLoader = 'changes_loader.js',
    FLPSandboxMockServer = 'flpSandboxMockServer.html',
    InitFlpSandboxMockServer = 'initFlpSandboxMockServer.js',
    InitFlpSandbox = 'initFlpSandbox.js',
    FlpSandboxJS = 'flpSandbox.js',
    Component = 'Component.js',
    MockServer = 'mockserver.js',
    PackageLock = 'package-lock.json',
    NeoApp = 'neo-app.json',
    Pom = 'pom.xml',
    GitIgnoreTmpl = 'gitignore.tmpl',
    ManifestJson = 'manifest.json',
    FioriSandboxConfig = 'fioriSandboxConfig.json',
    IndexHtml = 'index.html',
    V2IndexHtml = 'v2_index.html',
    V4IndexHtml = 'v4_index.html',
    LocateReuseLibs = 'locate-reuse-libs.js',
    AdaptationSettings = 'adaptation-app-settings',
    LibrarySettings = 'library-settings',
    XSAppTmpl = 'xs-app.json.tmpl',
    AppSettingsV4 = 'app-settings-v4',
    ModulePathForTests = 'ModulePathForTests.js',
    Testsuite = 'testsuite',
    FreestyleTestsuite = 'freestyle-testsuite',
    TestsuiteQunitHtml = 'testsuite.qunit.html'
}

// Templates are in ../templates relative to the dist directory
export const templatesDirPath = join(currentDir, '..', 'templates');

// SapUiLibs - replaces @sap/ux-app-templates types
export { SapUiLibs, PROJECT_TYPE } from './template-types.js';

// Public API - Main classes
export { ProjectMigrator } from './ProjectMigrator.js';
export { BulkProjectMigrator } from './BulkProjectMigrator.js';

// Public API - Types
export * from './types.js';

// Public API - i18n
export * from './i18n.js';

// Public API - Utilities (re-export selective functions for backward compatibility)
export {
    findProjectRoot,
    getProjectType,
    getMainService,
    hasDependency,
    getMinUI5VersionAsArray,
    type CdsUi5PluginInfo,
    readFile,
    readJSON,
    fileExists,
    writeFile,
    updateFile,
    updateJSON,
    deleteFile,
    findAllManifest,
    isFioriToolsProject,
    // Additional exports for test compatibility
    determineMessage,
    createDirectory
} from './utils/index.js';

// Additional exports from adapters for test compatibility
export { buildMainBackend, buildProxyConfig, buildPreviewMiddleware } from './adapters/ui5-config-helpers.js';
export { generateUI5YamlContent, generateUI5LocalYamlContent, generateUI5MockYamlContent } from './adapters/ui5-config-adapter.js';

// Additional exports from utils for test compatibility
export { readManifest, getUI5Version } from './utils/manifest-and-version-utils.js';
export { doesPropertyExist, stripSpaces, escapeSingleQuotes, escapeDoubleQuotes, doesDirectoryExists } from './utils/file-system-utils.js';
export { generateSapLibsStr, getSourceTemplate } from './utils/migration-utils.js';
export { getWebIDEProjectPathsAsLabels } from './utils/project-discovery.js';
export { handleGitIgnoreFile, handlePackageJsonFile, handleLocateReuseLibsFile } from './utils/template-generators/index.js';
export { validateMetadata } from './utils/service.js';
export { checkIfReuseLib, getReuseLibModuleName } from './utils/project-readers/reuse-lib-utils.js';
export { findAllProjectRoots, getReuseLibs, findAll, ReuseLibType } from './utils/file-discovery.js';
export { loadOrFetchProjectInfo } from './project/project-info.js';

// Public API - Project utilities (used by application-modeler-extension)
// Export directly from source to avoid circular dependency through utils/index.ts
export { ProjectAccess } from './utils/Project.js';
export { checkForMigration } from './utils/checkForMigration.js';
export { MigrationTypes } from './utils/constants.js';
