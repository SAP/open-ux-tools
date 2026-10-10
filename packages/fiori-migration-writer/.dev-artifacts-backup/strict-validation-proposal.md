# Strict Validation Mode - Implementation Proposal

## Overview
Proposal to add strict validation mode to fiori-migration-writer for better error handling and validation.

## Current Validation Points

### 1. Missing sap.ui5 Section in Manifest (manifest-update.ts:64)
- **Current**: WARNING
- **Message**: `MISSING_MANIFEST_UI5_SECTION`
- **Impact**: Manifest may be incomplete
- **Recommendation**: **ERROR in strict mode** - Critical for UI5 apps

### 2. Missing Backend URL (backend.ts:68)
- **Current**: WARNING
- **Message**: `MIGRATION_NO_BACKEND_URL`
- **Impact**: App cannot be previewed locally
- **Recommendation**: **ERROR in strict mode** - Required for development

### 3. Missing Metadata Config (validation.ts:33)
- **Current**: WARNING
- **Message**: `MISSING_METADATA_CONFIG`
- **Impact**: SAP Fiori tools features won't work
- **Recommendation**: **ERROR in strict mode** - Required for tooling

### 4. TypeScript Version Mismatch (ProjectMigrator.ts:353)
- **Current**: WARNING
- **Message**: `TYPESCRIPT_STRICT_MODE_WARNING`
- **Impact**: Potential type errors
- **Recommendation**: **Keep WARNING** - Informational only

## Proposed Implementation

### Phase 1: Add Strict Flag (2-3 hours)

Add optional `strict` parameter to ProjectMigrator.migrate():

```typescript
public static async migrate(
    projectRoot: string,
    backendURL: string,
    ui5SnapshotUrl: string,
    importProjectInfo?: Partial<ImportProjectInfo>,
    vscode?: any,
    internalToggle: boolean = false,
    fs?: Editor,
    strict: boolean = false  // NEW PARAMETER
): Promise<{ fs: Editor; result: boolean; messages: Message[] }>
```

### Phase 2: Update Validation Logic

Create helper function to determine message type based on strict mode:

```typescript
function getMessageType(
    defaultType: 'WARNING' | 'ERROR',
    isStrictMode: boolean,
    isCritical: boolean = true
): 'WARNING' | 'ERROR' {
    if (isStrictMode && isCritical) {
        return 'ERROR';
    }
    return defaultType;
}
```

### Phase 3: Update Message Creation

**Before:**
```typescript
messages.push({
    type: 'WARNING',
    description: i18nText('MISSING_MANIFEST_UI5_SECTION')
});
```

**After:**
```typescript
messages.push({
    type: getMessageType('WARNING', strict, true),
    description: i18nText('MISSING_MANIFEST_UI5_SECTION')
});
```

## Files to Update

### Source Files (4 files):
1. `src/ProjectMigrator.ts` - Add strict parameter
2. `src/config/manifest-update.ts` - Update WARNING → conditional ERROR
3. `src/config/backend.ts` - Update WARNING → conditional ERROR
4. `src/migration-process/validation.ts` - Update WARNING → conditional ERROR

### Test Files (6-8 files):
1. Update snapshot tests (6 snapshots)
2. Add strict mode test suite
3. Test both lenient and strict paths

## Test Strategy

### Existing Tests (Lenient Mode)
- Keep all existing tests with `strict: false` (default)
- All 167 tests should continue passing

### New Tests (Strict Mode)
- Add 18 new tests with `strict: true`
- Test that WARNINGs become ERRORs
- Test that migration fails appropriately

### Example Test:
```typescript
it('should fail in strict mode with missing backend URL', async () => {
    const { result, messages } = await ProjectMigrator.migrate(
        projectRoot,
        '', // Empty backend URL
        ui5Version,
        undefined,
        undefined,
        false,
        fs,
        true // strict mode
    );
    
    expect(result).toBe(false);
    const errors = messages.filter(m => m.type === 'ERROR');
    expect(errors.some(e => e.description.includes('back-end URL'))).toBe(true);
});
```

## Backward Compatibility

- Default `strict: false` maintains current behavior
- No breaking changes for existing consumers
- Opt-in strict validation

## Benefits

1. **Better Error Detection**: Critical issues fail immediately
2. **Developer Experience**: Clear feedback on what's wrong
3. **Production Readiness**: Ensure apps are properly configured
4. **Flexibility**: Users can choose validation level

## Migration Path

### For Consumers:
```typescript
// Current usage (lenient) - no changes needed
await ProjectMigrator.migrate(projectRoot, backend, ui5Version);

// Opt-in to strict validation
await ProjectMigrator.migrate(projectRoot, backend, ui5Version, undefined, undefined, false, fs, true);
```

### For Tools Suite Integration:
- Add UI toggle or config option for strict mode
- Default to lenient for backward compatibility
- Consider making strict default in future major version

## Timeline Estimate

- **Phase 1**: Add strict parameter - 30 minutes
- **Phase 2**: Update validation logic - 1 hour
- **Phase 3**: Update tests and snapshots - 1.5 hours
- **Total**: 2-3 hours

## Next Steps

1. Get approval on approach
2. Implement strict flag
3. Update validations
4. Add tests
5. Update documentation
