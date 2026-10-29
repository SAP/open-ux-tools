# Types Consolidation Analysis

**Date**: 2026-10-29  
**Branch**: `feat/consolidate-migration-types`  
**Goal**: Consolidate duplicate migration types between tools-suite and open-ux-tools

---

## Current State

### open-ux-tools (fiori-migration-writer)
```
src/
├── types.ts                     # Re-exports from migration-types.ts
├── migration-types.ts           # Main types (620 lines) - uses const objects
├── project-spec-types.ts        # OSS-compatible project spec types
├── template-types.ts            # Template constants and SapUiLibs
├── types/
│   ├── mem-fs-types.ts         # Mem-fs abstractions
│   └── project-folder.ts       # VS Code abstraction
```

### tools-suite (app-migrator)
```
src/
├── types.ts                     # Monolithic types file (598 lines) - uses enums
├── types/
│   ├── constants.ts
│   ├── migration.ts
│   ├── package.ts
│   ├── project-folder.ts       # Same as open-ux-tools
│   ├── project.ts              # Modular types
│   ├── service.ts
│   └── template.ts
```

---

## Key Differences

### 1. TypeScript Patterns

| Aspect | tools-suite | open-ux-tools | Correct per AGENTS.md |
|--------|-------------|---------------|----------------------|
| `ODataVersion` | `enum` | `const` object | ✅ const object |
| `SapUxLayer` | `enum` | `const` object | ✅ const object |
| `CapType` | `enum` | `const` object | ✅ const object |
| `DatasourceType` | `const enum` | `const` object | ✅ const object |
| `ApiHubType` | `const enum` | `const` object | ✅ const object |
| `SapSystemSourceType` | `const enum` | `const` object | ✅ const object |
| `neoAppJsonRouteTargetTypes` | `enum` | `const` object | ✅ const object |
| `TemplateDataKey` | `enum` | `const` object | ✅ const object |

**Verdict**: open-ux-tools uses the correct TypeScript best practice pattern throughout.

---

### 2. Import Dependencies

| Package | tools-suite | open-ux-tools |
|---------|-------------|---------------|
| Project spec types | `@sapux/project-spec` (SAP-internal) | `./project-spec-types.js` (inlined, OSS) |
| Manifest types | `@sapux/project-spec` | `@sap-ux/project-access` |

**Resolution**: open-ux-tools is already OSS-compatible.

---

### 3. Type Differences

#### 3.1 ProjectMigrate
```typescript
// tools-suite ONLY
extenstionSettings?: any;  // Note: typo "extenstionSettings"

// Both have all other fields
```

**Analysis**: Checked usage in tools-suite - field is defined but **never used** except in type definition. This is a typo that was carried forward.

**Action**: Do NOT add to open-ux-tools.

---

#### 3.2 Service Interface Signatures

**ProjectDataService.getPackageJson**
```typescript
// tools-suite
getPackageJson: (projectRoot: string) => Promise<any>;

// open-ux-tools
getPackageJson: (projectRoot: string) => any;
```

**Checked implementation in tools-suite**:
```typescript
// src/utils/Project.ts
public static getPackageJson(filePath: string): Promise<any> {
    return getPackageJson(filePath);  // Returns Promise
}
```

**Verdict**: tools-suite is correct - it IS async.

**Action**: Update open-ux-tools to use `Promise<any>`.

---

**BackendConfigService methods**
```typescript
// tools-suite - multiple methods are async
getFirstBackend: (...) => Promise<{...} | undefined>;
getFlpIntentFromHtml: (path: string) => Promise<string | undefined>;
getDestinationFromNeoApp: (...) => Promise<{...} | undefined>;

// open-ux-tools - some synchronous
getFirstBackend: (...) => { url?: string; ... };  // NOT wrapped in Promise
getFlpIntentFromHtml: (path: string) => string | undefined;  // NOT Promise
```

**Action**: Verify actual implementations and align to async pattern.

---

#### 3.3 Context Interfaces with `fs: Editor`

**RegularProjectContext**
```typescript
// tools-suite - Missing fs field
export interface RegularProjectContext {
    projectRoot: string;
    manifest: Manifest;
    defaultProjectInfo: ImportProjectInfo;
    projectInfo: ImportProjectInfo;
    services: {...};
}

// open-ux-tools - Has fs field
export interface RegularProjectContext {
    fs: Editor;  // ← Added
    projectRoot: string;
    manifest: Manifest;
    defaultProjectInfo: ImportProjectInfo;
    projectInfo: ImportProjectInfo;
    services: {...};
}
```

**TemplateAssemblyContext**
```typescript
// tools-suite - Missing fs field
export interface TemplateAssemblyContext {
    projectInfo: ImportProjectInfo;
    rootPath: string;
    // ...
}

// open-ux-tools - Has fs field
export interface TemplateAssemblyContext {
    fs: Editor;  // ← Added
    projectInfo: ImportProjectInfo;
    rootPath: string;
    // ...
}
```

**Action**: These are newer additions in open-ux-tools. Check if tools-suite needs them.

---

#### 3.4 Credentials Interface Security Documentation

```typescript
// open-ux-tools - Comprehensive security documentation
/**
 * User credentials for authentication.
 *
 * SECURITY: This interface contains sensitive authentication data.
 * The `password` field must NEVER be logged, included in error messages,
 * or transmitted to telemetry systems.
 */
export interface Credentials {
    /** Username for authentication */
    username: string;
    /**
     * Password for authentication.
     *
     * SECURITY: NEVER log this value, include in error messages, or store in plain text.
     * Handle with care and clear from memory when no longer needed.
     */
    password?: string;
}

// tools-suite - Minimal documentation
export interface Credentials {
    username: string;
    password?: string;
}
```

**Action**: Keep enhanced documentation from open-ux-tools.

---

### 4. FloorPlan Type

```typescript
// tools-suite - Missing FloorPlan type alias
export const FLOOR_PLAN = {
    WorklistV2: 'V2_WORKLIST',
    // ...
};
// No type alias exported

// open-ux-tools - Has type alias
export const FLOOR_PLAN = {
    WorklistV2: 'V2_WORKLIST',
    // ...
} as const;
export type FloorPlan = (typeof FLOOR_PLAN)[keyof typeof FLOOR_PLAN];
```

**Action**: open-ux-tools pattern is correct.

---

## Modular Types Structure

tools-suite has started modularizing types into separate files under `src/types/`:
- `constants.ts`
- `migration.ts`
- `package.ts`
- `project.ts`
- `service.ts`
- `template.ts`

This is a **good pattern** but incomplete. open-ux-tools keeps everything in one `migration-types.ts` file.

**Recommendation**: Either:
1. Keep open-ux-tools as single file (simpler for external consumers)
2. Fully modularize open-ux-tools into separate logical files

For now: **Keep single file** - easier to import as a package.

---

## Consolidation Plan

### Phase 1: Fix open-ux-tools Types ✅
1. [ ] Update service interface signatures to async where needed
2. [ ] Verify `fs: Editor` fields are needed in context interfaces
3. [ ] Run tests to ensure no breaking changes

### Phase 2: Update tools-suite to Import from open-ux-tools
1. [ ] Add `@sap-ux/fiori-migration-writer` dependency
2. [ ] Replace `src/types.ts` with imports
3. [ ] Keep `src/types/project-folder.ts` (VS Code abstraction)
4. [ ] Remove modular `src/types/*.ts` files (if fully covered by open-ux-tools)
5. [ ] Update all enum usages to const object pattern

### Phase 3: Testing
1. [ ] Verify no snapshot changes in tools-suite tests
2. [ ] Run full test suites in both repos
3. [ ] Check dependent packages for breakage

---

## Files to Modify

### open-ux-tools
- `src/migration-types.ts` - Update service interface signatures

### tools-suite
- `src/types.ts` - Replace with imports
- `src/types/constants.ts` - Check if needed
- `src/types/migration.ts` - Check if needed
- `src/types/package.ts` - Check if needed
- `src/types/project.ts` - Check if needed
- `src/types/service.ts` - Check if needed
- `src/types/template.ts` - Check if needed
- `package.json` - Add `@sap-ux/fiori-migration-writer` dependency

---

## Action Items

1. **Verify async signatures** - Check actual implementations in both repos
2. **Test fs: Editor fields** - Are they used in tools-suite?
3. **Decide on modular vs monolithic** - Current recommendation: keep monolithic
4. **Check for breaking changes** - Run tests after each change
