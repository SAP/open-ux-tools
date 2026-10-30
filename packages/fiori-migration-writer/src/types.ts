// Re-export all migration types for backward compatibility
export * from './migration-types.js';

// Re-export template types (SapUiLibs)
export * from './template-types.js';

// Re-export shared constants - import directly from source, don't re-export through migration-types
export { ApiHubType, SapSystemSourceType } from '@sap-ux/fiori-generator-shared';
export { ODataVersion } from '@sap-ux/axios-extension';
export { TemplateType } from '@sap-ux/fiori-elements-writer';

// Re-export mem-fs types for consumers who need to extend editor functionality
export type { MemFsFile, MemFsStore, EditorWithStore } from './types/mem-fs-types.js';
export { hasStore } from './types/mem-fs-types.js';
