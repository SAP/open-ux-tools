// Re-export all migration types for backward compatibility
export * from './migration-types.js';

// Re-export mem-fs types for consumers who need to extend editor functionality
export type { MemFsFile, MemFsStore, EditorWithStore } from './types/mem-fs-types.js';
export { hasStore } from './types/mem-fs-types.js';
