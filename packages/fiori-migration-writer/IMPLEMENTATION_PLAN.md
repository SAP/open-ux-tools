# Types Consolidation - Implementation Plan

**Branch**: `feat/consolidate-migration-types` (open-ux-tools)  
**Date**: 2026-10-29  
**Status**: Ready to implement

---

## Strategy: Split Data Types from Service Interfaces

After analyzing both codebases, the optimal strategy is:

✅ **Consolidate shared data types** in open-ux-tools  
✅ **Keep service interfaces separate** (different I/O patterns: mem-fs vs fs.promises)

---

## Phase 1: Verify open-ux-tools Types (Current)

### Types Already Correct ✅
- All data types use `const` objects instead of `enum` (per AGENTS.md guidelines)
- Security documentation on `Credentials` interface is comprehensive
- `FloorPlan` type alias is properly exported
- OSS-compatible imports (no `@sapux/*` dependencies)

### Minor Issues to Fix

#### 1. Add Missing FloorPlan Type Export
**File**: `src/template-types.ts`
```typescript
// Add type alias export
export type ProjectType = (typeof PROJECT_TYPE)[keyof typeof PROJECT_TYPE];
```

#### 2. Verify All Exports in types.ts
**File**: `src/types.ts`  
Currently:
```typescript
export * from './migration-types.js';
export type { MemFsFile, MemFsStore, EditorWithStore } from './types/mem-fs-types.js';
export { hasStore } from './types/mem-fs-types.js';
```

Should also export from `template-types.ts`:
```typescript
export * from './migration-types.js';
export * from './template-types.js';  // Add this
export type { MemFsFile, MemFsStore, EditorWithStore } from './types/mem-fs-types.js';
export { hasStore } from './types/mem-fs-types.js';
```

---

## Phase 2: Remove Service Interfaces from open-ux-tools

These interfaces should **NOT** be in the shared types because they differ per I/O implementation:

**Remove from `migration-types.ts`** (lines 542-620):
```typescript
// DELETE - Service interfaces
export interface ProjectDataService { ... }
export interface ManifestAnalysisService { ... }
export interface BackendConfigService { ... }
export interface RegularProjectContext { ... }  // Uses services
```

**Keep configuration context interfaces** (these are data structures):
```typescript
// KEEP - These are data types, not service interfaces
export interface UI5ConfigOptions { ... }
export interface BackendConfigOptions { ... }
export interface LibraryConfigOptions { ... }
export interface Ui5YamlContext { ... }
export interface PackageJsonDependencies { ... }
export interface FLPConfiguration { ... }
export interface PackageJsonFeatureFlags { ... }
export interface PackageJsonContext { ... }
export interface TemplateAssemblyFlags { ... }
export interface TemplateConfigData { ... }
export interface TemplateModuleInfo { ... }
export interface TemplateAssemblyContext { ... }  // Remove fs: Editor field
```

**Action for TemplateAssemblyContext**:
```typescript
export interface TemplateAssemblyContext {
    // fs: Editor;  // REMOVE - implementation detail
    projectInfo: ImportProjectInfo;
    rootPath: string;
    projectData: any;
    serviceData: any;
    config: TemplateConfigData;
    moduleInfo: TemplateModuleInfo;
    ui5Config: UI5ConfigOptions;
    backendConfig: BackendConfigOptions;
    libraryConfig: LibraryConfigOptions;
    flags: TemplateAssemblyFlags;
}
```

---

## Phase 3: Update tools-suite to Use open-ux-tools Types

### 3.1 Add Dependency

**File**: `/Users/I320242/Documents/SAPDevelop/tools-suite/packages/lib/app-migrator/package.json`

```json
{
  "dependencies": {
    "@sap-ux/fiori-migration-writer": "workspace:*"
  }
}
```

### 3.2 Replace types.ts

**File**: `/Users/I320242/Documents/SAPDevelop/tools-suite/packages/lib/app-migrator/src/types.ts`

**Replace entire file with**:
```typescript
// Re-export all shared migration types from open-ux-tools
export * from '@sap-ux/fiori-migration-writer';

// Re-export project-folder abstraction (keep local for VS Code coupling)
export type { ProjectFolder } from './types/project-folder';
export { isProjectFolderArray } from './types/project-folder';

// Service interfaces - tools-suite specific (async I/O with fs.promises)
export interface ProjectDataService {
    getPackageJson: (projectRoot: string) => Promise<any>;
    getMainEntity: (manifest: Manifest) => string;
    hasUI5Tooling: (packageJson: any) => boolean;
}

export interface ManifestAnalysisService {
    getSemanticObjectAction: (manifest: Manifest) => string | undefined;
    getVersionFromManifest: (manifest: Manifest) => FioriElementsVersion | undefined;
    getFloorPlan: (manifest: Manifest, feVersion: FioriElementsVersion | undefined) => string;
}

export interface BackendConfigService {
    getFirstBackend: (projectRoot: string) => Promise<
        | {
              url?: string;
              destination?: string;
              scp?: boolean;
              sapClient?: string;
          }
        | undefined
    >;
    getFlpIntentFromHtml: (path: string) => Promise<string | undefined>;
    getDestinationFromNeoApp: (
        projectRoot: string,
        destination: string
    ) => Promise<
        | {
              destination?: string;
              neoAppUI5Version?: string;
              neoappDestinations?: NeoappDestination[];
          }
        | undefined
    >;
    getClientFromDestinationName: (destination: string) => string;
}

export interface RegularProjectContext {
    projectRoot: string;
    manifest: Manifest;
    defaultProjectInfo: ImportProjectInfo;
    projectInfo: ImportProjectInfo;
    services: {
        projectData: ProjectDataService;
        manifestAnalysis: ManifestAnalysisService;
        backendConfig: BackendConfigService;
    };
}
```

### 3.3 Remove Modular Type Files (if fully covered)

**Check and potentially delete**:
- `src/types/constants.ts` - If exported by open-ux-tools
- `src/types/migration.ts` - If exported by open-ux-tools
- `src/types/package.ts` - If exported by open-ux-tools
- `src/types/project.ts` - If exported by open-ux-tools (except service interfaces)
- `src/types/service.ts` - If exported by open-ux-tools
- `src/types/template.ts` - If exported by open-ux-tools

**Keep**:
- `src/types/project-folder.ts` - VS Code abstraction

### 3.4 Fix Import Statements

**In all files that import from `@sapux/project-spec`**:
```typescript
// OLD
import type { FioriElementsVersion, SapAppSourceTemplate, Manifest } from '@sapux/project-spec';

// NEW
import type { FioriElementsVersion, SapAppSourceTemplate, Manifest } from './types';
// OR if directly using open-ux-tools types
import type { FioriElementsVersion, SapAppSourceTemplate, Manifest } from '@sap-ux/fiori-migration-writer';
```

---

## Phase 4: Testing

### 4.1 open-ux-tools
```bash
cd /Users/I320242/Documents/SAPDevelop/open-ux-tools/packages/fiori-migration-writer
yarn build
yarn test
yarn lint
```

### 4.2 tools-suite
```bash
cd /Users/I320242/Documents/SAPDevelop/tools-suite/packages/lib/app-migrator
yarn build
yarn test  # Ensure no snapshot changes!
yarn lint
```

### 4.3 Integration Tests
```bash
cd /Users/I320242/Documents/SAPDevelop/tools-suite
yarn build:scope @sap/ux-app-migrator
yarn test:scope @sap/ux-app-migrator
```

---

## Phase 5: Commit Strategy

### Commit 1: open-ux-tools
```
feat(fiori-migration-writer): consolidate migration types

- Export template types from main types.ts
- Remove service interfaces (implementation-specific)
- Remove fs: Editor from TemplateAssemblyContext
- Add ProjectType alias to template-types.ts

BREAKING CHANGE: Removed service interfaces from exported types
(ProjectDataService, ManifestAnalysisService, BackendConfigService,
RegularProjectContext). These should be defined per implementation.
```

### Commit 2: tools-suite
```
refactor(app-migrator): use types from @sap-ux/fiori-migration-writer

- Import shared migration types from open-ux-tools
- Keep service interfaces locally (async fs.promises I/O)
- Remove duplicate type definitions
- Maintain VS Code abstraction (project-folder.ts)

No behavioral changes - all tests pass with no snapshot changes.
```

---

## Rollback Plan

If issues arise:
1. Revert tools-suite commit (types.ts changes)
2. Revert open-ux-tools commit (service interface removal)
3. Both repos remain in working state

---

## Success Criteria

✅ All tests pass in both repos  
✅ No snapshot changes in tools-suite tests  
✅ Lint passes in both repos  
✅ Build succeeds in both repos  
✅ No breaking changes for external consumers  
✅ Type duplication eliminated (except service interfaces)

---

## Next Steps

1. Implement Phase 1 changes in open-ux-tools
2. Run tests
3. Implement Phase 3 changes in tools-suite
4. Run tests
5. Create PRs for both repos
