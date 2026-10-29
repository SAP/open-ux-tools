# Type Consolidation - Completed Actions

**Date**: 2026-10-29  
**Branch**: `feat/consolidate-migration-types`  
**Status**: ✅ Fixed obvious duplications

---

## ✅ Completed Actions

### 1. Added Missing Values to @sap-ux/project-access

**File**: `packages/project-access/src/constants.ts`

#### Added to FileName:
```typescript
NeoApp: 'neo-app.json',  // Used by fiori-migration-writer
```

#### Added to DirName (alphabetically sorted):
```typescript
I18n: 'i18n',     // Used by fiori-migration-writer
Sapux: 'src',     // Used by fiori-migration-writer  
Test: 'test',     // Used by fiori-migration-writer
```

---

### 2. Updated fiori-migration-writer to Import from project-access

**File**: `packages/fiori-migration-writer/src/project-spec-types.ts`

**Before** (~70 lines of duplicate code):
```typescript
export const FileName = {
    Manifest: 'manifest.json',
    Package: 'package.json',
    // ... 10 more entries
} as const;

export const DirName = {
    Webapp: 'webapp',
    // ... 5 more entries
} as const;

export interface Package {
    name?: string;
    version?: string;
    // ... 10 more fields
}
```

**After** (1 line!):
```typescript
// Re-export types from @sap-ux/project-access
export type { Manifest, ManifestNamespace, Package } from '@sap-ux/project-access';

// Re-export const objects (values + types) from @sap-ux/project-access
export { FileName, DirName } from '@sap-ux/project-access';
```

**Lines removed**: ~70 lines of duplicate type definitions ✅

---

### 3. Fixed SapUxLayer Duplication

**File**: `packages/fiori-migration-writer/src/migration-types.ts`

**Before**:
```typescript
export const SapUxLayer = {
    VENDOR: 'VENDOR',
    CUSTOMER_BASE: 'CUSTOMER_BASE'
} as const;
export type SapUxLayer = (typeof SapUxLayer)[keyof typeof SapUxLayer];
```

**After**:
```typescript
// Import UI5FlexLayer and alias as SapUxLayer for backwards compatibility
import type { UI5FlexLayer } from '@sap-ux/project-access';

/**
 * SAP UX Layer values for flex changes
 * Re-exported from @sap-ux/project-access as UI5FlexLayer
 */
export const SapUxLayer = {
    VENDOR: 'VENDOR',
    CUSTOMER_BASE: 'CUSTOMER_BASE'
} as const;
export type SapUxLayer = UI5FlexLayer;
```

**Benefit**: Type is now backed by project-access, const object kept for backwards compatibility

---

### 4. Fixed Casing Issues

Fixed casing mismatches between old code and project-access:
- `FileName.UI5Yaml` → `FileName.Ui5Yaml`
- `FileName.UI5LocalYaml` → `FileName.Ui5LocalYaml`
- `FileName.UI5MockYaml` → `FileName.Ui5MockYaml`

**Files updated**:
- `src/ProjectMigrator.ts`
- `src/utils/project-readers/webapp-path-resolver.ts`

---

## Build Status

✅ **project-access builds successfully**  
✅ **fiori-migration-writer builds successfully**  
⏳ **Running tests** (in background)

---

## Next Steps: Investigation Phase

### Priority 1: ODataVersion Compatibility ⚠️

**Current status**: fiori-migration-writer defines its own
```typescript
export const ODataVersion = {
    v2: '2',
    v4: '4'
} as const;
```

**project-access has**:
```typescript
export type ODataVersion = NonNullable<ManifestNamespace.Setting['odataVersion']>;
```

**Action**: Need to verify if they're compatible. The project-access version extracts from the Manifest schema.

### Priority 2: CapService Compatibility ⚠️

**@sap-ux/cap-config-writer has**:
```typescript
export interface CapService {
    projectPath: string;
    cdsVersionInfo?: CdsVersionInfo;
    serviceName: string;
    urlPath?: string;
    serviceCdsPath?: string;
    capType?: CapRuntime;
    appPath?: string;
}
```

**fiori-migration-writer has**:
```typescript
export interface CapService {
    projectPath: string;
    serviceName: string;
    appPath?: string;
    serviceCdsPath?: string;
    capType?: CapType;  // Different type!
    capCdsInfo?: CdsUi5PluginInfo;  // Extra field
}
```

**Differences**:
- capType: `CapRuntime` vs `CapType`
- Missing: `cdsVersionInfo`, `urlPath`
- Extra: `capCdsInfo`

**Options**:
1. Extend cap-config-writer's type with missing fields
2. Contribute changes back to cap-config-writer
3. Keep separate with documentation

### Priority 3: Credentials Duplication 📋

**Found in 7+ packages**:
- abap-deploy-config-inquirer
- fiori-app-sub-generator
- generator-adp
- fiori-migration-writer
- (and more...)

All have identical:
```typescript
export interface Credentials {
    username: string;
    password?: string;
}
```

**Recommendation**: Move to a shared location (separate effort, affects many packages)

---

## Summary

### What We Fixed ✅
- ✅ Removed ~70 lines of duplicate type code
- ✅ Centralized FileName, DirName, Package in project-access
- ✅ Aligned SapUxLayer with UI5FlexLayer
- ✅ All builds pass

### What Needs Investigation ⚠️
- ⚠️ ODataVersion compatibility
- ⚠️ CapService - can we unify?
- 📋 Credentials - bigger consolidation effort

### Impact
- **Code reduction**: ~70 lines removed from fiori-migration-writer
- **Maintainability**: Single source of truth for common constants
- **Type safety**: Better alignment across packages
- **Risk**: Low - all changes are imports, no behavioral changes
