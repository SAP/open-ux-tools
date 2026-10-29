# Types Already Available in open-ux-tools - Consolidation Opportunities

**Date**: 2026-10-29  
**Analysis**: Check existing type packages to avoid duplication

---

## Types Already Exported from `@sap-ux/project-access` ✅

### 1. Manifest Types
```typescript
// packages/project-access/src/types/webapp/index.ts
export type { ManifestNamespace };
export type Manifest = ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile;
```

**Status**: ✅ **Already used by fiori-migration-writer**
```typescript
// packages/fiori-migration-writer/src/project-spec-types.ts
export type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
```

---

### 2. Package Types
```typescript
// packages/project-access/src/types/package/index.ts
interface SapUxPackage {
    sapux?: boolean | string[];
    sapuxLayer?: UI5FlexLayer;
    cds?: object;
    ui5?: { dependencies?: string[] };
    remarkConfig?: object;
}
export type UI5FlexLayer = 'VENDOR' | 'CUSTOMER_BASE';
export type Package = PackageJson & SapUxPackage;
```

**Status**: ⚠️ **Partially duplicated**

fiori-migration-writer has:
```typescript
// packages/fiori-migration-writer/src/project-spec-types.ts
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

**Opportunity**: ✅ Could import `Package` from `@sap-ux/project-access` instead

---

### 3. UI5FlexLayer / SapUxLayer
```typescript
// packages/project-access/src/types/package/index.ts
export type UI5FlexLayer = 'VENDOR' | 'CUSTOMER_BASE';

// packages/fiori-migration-writer/src/migration-types.ts
export const SapUxLayer = {
    VENDOR: 'VENDOR',
    CUSTOMER_BASE: 'CUSTOMER_BASE'
} as const;
export type SapUxLayer = (typeof SapUxLayer)[keyof typeof SapUxLayer];
```

**Status**: ❌ **Duplicated with different names**

**Opportunity**: ✅ Could import `UI5FlexLayer` from `@sap-ux/project-access` and alias as `SapUxLayer`

---

### 4. ODataVersion
```typescript
// packages/project-access/src/types/info/index.ts
export type ODataVersion = NonNullable<ManifestNamespace.Setting['odataVersion']>;
// This extracts the type from Manifest's odataVersion field
```

**Status**: ⚠️ **Different implementation**

fiori-migration-writer has:
```typescript
export const ODataVersion = {
    v2: '2',
    v4: '4'
} as const;
export type ODataVersion = (typeof ODataVersion)[keyof typeof ODataVersion];
```

**Opportunity**: ⚠️ Need to verify if they're compatible - project-access version is derived from Manifest schema

---

## Summary of Consolidation Opportunities

| Type | fiori-migration-writer | project-access | Action |
|------|----------------------|----------------|--------|
| `Manifest` | ✅ Imports from project-access | ✅ Exports | Already consolidated |
| `ManifestNamespace` | ✅ Imports from project-access | ✅ Exports | Already consolidated |
| `Package` | ❌ Defines own | ✅ Exports | **Import from project-access** |
| `SapUxLayer` / `UI5FlexLayer` | ❌ Defines own | ✅ Exports | **Import and alias** |
| `ODataVersion` | ❌ Defines own | ✅ Exports | **Verify compatibility, then import** |
| `FioriElementsVersion` | ❌ Defines own | ❌ Not in project-access | Keep in migration-writer |

---

## Recommended Changes

### Change 1: Use Package from project-access

**Current** (`project-spec-types.ts`):
```typescript
export interface Package {
    name?: string;
    version?: string;
    // ... lots of fields
}
```

**Replace with**:
```typescript
export type { Package } from '@sap-ux/project-access';
```

---

### Change 2: Use UI5FlexLayer as SapUxLayer

**Current** (`migration-types.ts`):
```typescript
export const SapUxLayer = {
    VENDOR: 'VENDOR',
    CUSTOMER_BASE: 'CUSTOMER_BASE'
} as const;
export type SapUxLayer = (typeof SapUxLayer)[keyof typeof SapUxLayer];
```

**Replace with**:
```typescript
export type { UI5FlexLayer as SapUxLayer } from '@sap-ux/project-access';
```

Or keep the const object for backwards compatibility:
```typescript
import type { UI5FlexLayer } from '@sap-ux/project-access';
export const SapUxLayer = {
    VENDOR: 'VENDOR',
    CUSTOMER_BASE: 'CUSTOMER_BASE'
} as const;
export type SapUxLayer = UI5FlexLayer; // Use the type from project-access
```

---

### Change 3: Verify ODataVersion compatibility

Need to check if project-access's ODataVersion matches our usage ('2' | '4').

---

## Impact Analysis

### Benefits ✅
1. Less code duplication
2. Single source of truth for common types
3. Automatic updates when project-access types evolve
4. Better type safety (unified types across packages)

### Risks ⚠️
1. Breaking changes if project-access types change
2. Need to verify all usages still work
3. May need to keep some wrapper types for backwards compatibility

---

## Testing Required

- [ ] Verify Package type from project-access has all needed fields
- [ ] Check ODataVersion compatibility
- [ ] Run full test suite after changes
- [ ] Verify no snapshot changes
- [ ] Check downstream consumers (tools-suite)

---

## Next Steps

1. Verify ODataVersion type compatibility
2. Update project-spec-types.ts to import from project-access
3. Update migration-types.ts to use project-access types
4. Run tests to ensure no breaking changes
5. Update documentation
