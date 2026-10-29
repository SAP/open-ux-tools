# Type Duplication Found - Action Required

**Date**: 2026-10-29  
**Status**: Ready to fix

---

## Confirmed Duplications ❌

### 1. FileName ✅ EXISTS IN @sap-ux/project-access
**Location**: `packages/project-access/src/constants.ts`
```typescript
export const FileName = {
    Manifest: 'manifest.json',
    Package: 'package.json',
    Ui5Yaml: 'ui5.yaml',
    Ui5LocalYaml: 'ui5-local.yaml',
    Ui5MockYaml: 'ui5-mock.yaml',
    // ... many more
} as const;
```

**Duplicated in**: `fiori-migration-writer/src/project-spec-types.ts`
```typescript
export const FileName = {
    Manifest: 'manifest.json',
    Package: 'package.json',
    Ui5Yaml: 'ui5.yaml',
    Ui5LocalYaml: 'ui5-local.yaml',
    Ui5MockYaml: 'ui5-mock.yaml',
    NeoApp: 'neo-app.json',
    XsApp: 'xs-app.json',
    ExtConfigJson: '.extconfig.json',
    Pom: 'pom.xml',
    Component: 'Component.js',
    IndexHtml: 'index.html'
} as const;
```

**Analysis**: 
- project-access has 26 file names
- fiori-migration-writer has subset + a few extras (NeoApp, XsApp, Component, IndexHtml, ExtConfigJson, Pom)
- **Action**: Import from project-access, add missing ones there if needed

---

### 2. DirName ✅ EXISTS IN @sap-ux/project-access
**Location**: `packages/project-access/src/constants.ts`
```typescript
export const DirName = {
    Changes: 'changes',
    Webapp: 'webapp',
    LocalService: 'localService',
    // ... many more
} as const;
```

**Duplicated in**: `fiori-migration-writer/src/project-spec-types.ts`
```typescript
export const DirName = {
    Webapp: 'webapp',
    LocalService: 'localService',
    Test: 'test',
    I18n: 'i18n',
    Changes: 'changes',
    Sapux: 'src'
} as const;
```

**Analysis**: 
- project-access has 21 directory names
- fiori-migration-writer has subset + "Sapux" and "Test" and "I18n"
- **Action**: Import from project-access, add missing ones there if needed

---

### 3. Package ✅ EXISTS IN @sap-ux/project-access
**Location**: `packages/project-access/src/types/package/index.ts`
```typescript
export type Package = PackageJson & SapUxPackage;
```

**Duplicated in**: `fiori-migration-writer/src/project-spec-types.ts`
```typescript
export interface Package {
    name?: string;
    version?: string;
    description?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    ui5?: { dependencies?: string[] };
    sapux?: string[] | boolean;
    [key: string]: unknown;
}
```

**Action**: ✅ Import from `@sap-ux/project-access`

---

### 4. UI5FlexLayer (SapUxLayer) ✅ EXISTS IN @sap-ux/project-access
**Location**: `packages/project-access/src/types/package/index.ts`
```typescript
export type UI5FlexLayer = 'VENDOR' | 'CUSTOMER_BASE';
```

**Duplicated in**: `fiori-migration-writer/src/migration-types.ts`
```typescript
export const SapUxLayer = {
    VENDOR: 'VENDOR',
    CUSTOMER_BASE: 'CUSTOMER_BASE'
} as const;
export type SapUxLayer = (typeof SapUxLayer)[keyof typeof SapUxLayer];
```

**Action**: ✅ Import `UI5FlexLayer` and alias or keep const object pointing to it

---

### 5. CapService ⚠️ EXISTS IN @sap-ux/cap-config-writer (BUT DIFFERENT)
**Location**: `packages/cap-config-writer/src/cap-config/types.ts`
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

**Duplicated in**: `fiori-migration-writer/src/migration-types.ts`
```typescript
export interface CapService {
    projectPath: string; // The CAP Project Root
    serviceName: string;
    appPath?: string; // Optional custom CAP app folder
    serviceCdsPath?: string; // relative path to cap service cds file
    capType?: CapType; // CAP implementation type,
    capCdsInfo?: CdsUi5PluginInfo; // Has min @sap/cds version, NPM Workspces and cds plugin configured
}
```

**Analysis**:
- cap-config-writer: has `cdsVersionInfo`, `urlPath`, uses `CapRuntime` type
- fiori-migration-writer: has `capCdsInfo`, uses `CapType`, missing `urlPath`
- **The interfaces are SIMILAR but NOT identical**

**Action**: ⚠️ **CANNOT directly replace** - need to:
1. Check if we can extend cap-config-writer's type
2. OR contribute missing fields back to cap-config-writer
3. OR keep separate (with comment explaining why)

---

### 6. Credentials ⚠️ EXISTS IN MULTIPLE PACKAGES
**Locations**:
- `packages/abap-deploy-config-inquirer/src/types.ts`
- `packages/fiori-app-sub-generator/src/types/state.ts`
- `packages/generator-adp/src/types.ts`

**All have**:
```typescript
export interface Credentials {
    username: string;
    password?: string;
}
```

**fiori-migration-writer also has**:
```typescript
export interface Credentials {
    username: string;
    password?: string;
}
```

**Analysis**: ❌ **NO SHARED LOCATION** - this is duplicated across MANY packages!
**Action**: ⚠️ Consider moving to a shared package like `@sap-ux/inquirer-common` or `@sap-ux/project-access`

---

## Summary

| Type | Source Package | Status | Action |
|------|---------------|--------|--------|
| `FileName` | `@sap-ux/project-access` | ✅ Exact match | Import + add missing values |
| `DirName` | `@sap-ux/project-access` | ✅ Exact match | Import + add missing values |
| `Package` | `@sap-ux/project-access` | ✅ Compatible | Import directly |
| `UI5FlexLayer` / `SapUxLayer` | `@sap-ux/project-access` | ✅ Compatible | Import + alias |
| `CapService` | `@sap-ux/cap-config-writer` | ⚠️ Different | Evaluate: extend or keep separate |
| `Credentials` | Multiple packages | ❌ Scattered | Consider consolidating |
| `ODataVersion` | `@sap-ux/project-access` | ⚠️ Needs check | Verify compatibility |

---

## Immediate Actions

### Priority 1: Safe Consolidations ✅
1. Import `FileName` from `@sap-ux/project-access`
2. Import `DirName` from `@sap-ux/project-access`
3. Import `Package` from `@sap-ux/project-access`
4. Import `UI5FlexLayer` as `SapUxLayer` from `@sap-ux/project-access`

### Priority 2: Investigate & Decide ⚠️
5. Check `ODataVersion` compatibility with manifest schema type
6. Evaluate `CapService` - can we extend cap-config-writer's type?
7. Consider `Credentials` consolidation (separate effort - affects many packages)

---

## Implementation Steps

1. Update `project-spec-types.ts` to import from `@sap-ux/project-access`
2. Update `migration-types.ts` to import from `@sap-ux/project-access`
3. Add missing FileName/DirName values to `@sap-ux/project-access` if needed
4. Run tests to ensure compatibility
5. Update documentation
