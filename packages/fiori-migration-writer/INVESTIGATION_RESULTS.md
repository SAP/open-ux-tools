# Investigation Results - ODataVersion and CapService

**Date**: 2026-10-29  
**Status**: Analysis complete

---

## Finding 1: CapRuntime vs CapType ✅ CAN CONSOLIDATE

### Current State

**fiori-generator-shared** (the source):
```typescript
export type CapRuntime = 'Node.js' | 'Java';
```

**cap-config-writer** uses CapRuntime:
```typescript
import type { CapRuntime } from '@sap-ux/fiori-generator-shared';

export interface CapService {
    capType?: CapRuntime;  // Uses CapRuntime
    // ...
}
```

**fiori-migration-writer** duplicates it:
```typescript
export const CapType = {
    NODE_JS: 'Node.js',
    JAVA: 'Java'
} as const;
export type CapType = (typeof CapType)[keyof typeof CapType];
```

### Analysis ✅

They're **IDENTICAL**!
- Both represent: `'Node.js' | 'Java'`
- Just different patterns (const object vs type union)

### Action Required ✅

**Replace in fiori-migration-writer**:
```typescript
// Import from fiori-generator-shared
import type { CapRuntime } from '@sap-ux/fiori-generator-shared';

// For backwards compatibility, keep const object but use imported type
export const CapType = {
    NODE_JS: 'Node.js',
    JAVA: 'Java'
} as const;
export type CapType = CapRuntime;  // Use the shared type
```

**Update CapService interface**:
```typescript
export interface CapService {
    projectPath: string;
    serviceName: string;
    appPath?: string;
    serviceCdsPath?: string;
    capType?: CapRuntime;  // Change from CapType to CapRuntime
    capCdsInfo?: CdsUi5PluginInfo;
}
```

---

## Finding 2: CapService Differences ⚠️ NEED DECISION

### Comparison

| Field | cap-config-writer | fiori-migration-writer | Compatible? |
|-------|-------------------|------------------------|-------------|
| `projectPath` | ✅ string | ✅ string | ✅ Yes |
| `serviceName` | ✅ string | ✅ string | ✅ Yes |
| `appPath` | ✅ optional string | ✅ optional string | ✅ Yes |
| `serviceCdsPath` | ✅ optional string | ✅ optional string | ✅ Yes |
| `capType` | ✅ CapRuntime | ✅ CapType (same!) | ✅ Yes |
| `cdsVersionInfo` | ✅ CdsVersionInfo | ❌ Missing | ⚠️ |
| `urlPath` | ✅ optional string | ❌ Missing | ⚠️ |
| `capCdsInfo` | ❌ Missing | ✅ CdsUi5PluginInfo | ⚠️ |

### Option A: Import and Extend ✅ RECOMMENDED

```typescript
import type { CapService as CapServiceBase } from '@sap-ux/cap-config-writer';
import type { CdsUi5PluginInfo } from '@sap-ux/project-access';

export interface CapService extends CapServiceBase {
    capCdsInfo?: CdsUi5PluginInfo;
}
```

**Pros**: 
- Reuses cap-config-writer type
- Adds migration-specific field
- Maintains compatibility

**Cons**: 
- Adds dependency on cap-config-writer

### Option B: Keep Separate with Comment

```typescript
/**
 * CAP Service configuration for migration
 * 
 * Similar to @sap-ux/cap-config-writer's CapService but with migration-specific fields.
 * Kept separate to avoid dependency on cap-config-writer.
 */
export interface CapService {
    // ... current definition
}
```

**Pros**: 
- No new dependency
- Full control

**Cons**: 
- Duplication remains

---

## Finding 3: ODataVersion ✅ CAN USE FROM PROJECT-ACCESS

### Current State

**project-access**:
```typescript
export type ODataVersion = NonNullable<ManifestNamespace.Setting['odataVersion']>;
```

This extracts the type from the UI5 manifest schema. The manifest schema defines odataVersion as a string, likely `'2' | '4'`.

**fiori-migration-writer**:
```typescript
export const ODataVersion = {
    v2: '2',
    v4: '4'
} as const;
export type ODataVersion = (typeof ODataVersion)[keyof typeof ODataVersion];
// Type is: '2' | '4'
```

### Analysis ✅

Both resolve to: `'2' | '4'` (string union)

### Action Required ✅

**Option 1: Import from project-access (minimal change)**
```typescript
import type { ODataVersion } from '@sap-ux/project-access';

// Keep const object for backwards compatibility
export const ODataVersion = {
    v2: '2',
    v4: '4'
} as const;
// But type comes from project-access
export type { ODataVersion } from '@sap-ux/project-access';
```

**Option 2: Just import (breaking change for const usage)**
```typescript
export type { ODataVersion } from '@sap-ux/project-access';
```

**Recommendation**: Option 1 - keeps const object for `ODataVersion.v2` usage

---

## Summary

### Can Consolidate ✅
1. **CapType → CapRuntime** from `@sap-ux/fiori-generator-shared`
2. **ODataVersion** from `@sap-ux/project-access` (keep const object)

### Needs Decision ⚠️
3. **CapService** - Should we extend cap-config-writer's version?

### Recommendation

**Implement 1 & 2 now**, decide on 3 based on:
- Is the dependency on cap-config-writer acceptable?
- Will cap-config-writer's CapService evolve in ways that help migration-writer?
- Is `capCdsInfo` truly migration-specific or could it be useful in cap-config-writer?

---

## Next Actions

1. ✅ Import CapRuntime from fiori-generator-shared
2. ✅ Import ODataVersion type from project-access (keep const)
3. ⚠️ **Decision needed**: CapService - extend or keep separate?
