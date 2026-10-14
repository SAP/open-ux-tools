// Common utilities (includes FIORI_TOOLS_PROXY, FIORI_TOOLS_APPRELOAD, escapeDoubleQuotes, etc.)
export * from './common.js';

// Note: Project, checkForMigration, and constants are exported directly from src/index.ts
// to avoid circular dependencies. Do not re-export them here.

// UI5 Theme utilities (includes updateThemeAttribute)
export * from './UI5Theme.js';

// Service validation
export { validateMetadata } from './service.js';

// Migration utilities
export { determineMessage } from './migration-utils.js';

// File system utilities
export { createDirectory } from './file-system-utils.js';

// Re-export native file access to replace @sap/ux-project-access file I/O
export { readFile, readJSON, fileExists, writeFile, updateFile, updateJSON, deleteFile } from './file-access.js';

// Re-export native file discovery to replace @sap/ux-project-access
export { findAllProjectRoots, getReuseLibs, ReuseLibType } from './file-discovery.js';

// Re-export modern @sap-ux/project-access functions (open source)
export {
    findProjectRoot,
    getProjectType,
    getMainService,
    hasDependency,
    getMinUI5VersionAsArray,
    type CdsUi5PluginInfo
} from '@sap-ux/project-access';

// Adapters for modern @sap-ux/project-access package
export { findAllManifest, isFioriToolsProject } from './project-access-adapters.js';

// Template utilities
export {
    getSapTemplatesMap,
    getFeTemplatesMap,
    getFLPSandboxTemplatesMap,
    getFLPSandboxMockServerTemplatesMap,
    getCommonV4TemplatesMap,
    getBaseTemplatesMap
} from './template-maps.js';

// UI5 version utilities
export { getUI5Version } from './manifest-and-version-utils.js';
