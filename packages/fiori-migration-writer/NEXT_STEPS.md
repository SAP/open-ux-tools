# Next Steps: Creating the Wrapper

This document outlines the steps to complete the migration by creating a wrapper in `@sap/ux-app-migrator`.

## Current Status

✅ `@sap-ux/fiori-migration-writer` is complete and compiled  
⏳ `@sap/ux-app-migrator` needs to be converted to a wrapper

## Step 1: Update `@sap/ux-app-migrator` package.json

Add dependency:
```json
"dependencies": {
    "@sap-ux/fiori-migration-writer": "1.0.0",
    // ... keep other dependencies
}
```

## Step 2: Replace src/index.ts

```typescript
// Re-export everything from the open-source package
export * from '@sap-ux/fiori-migration-writer';

// Keep any VS Code-specific extensions here if needed
```

## Step 3: Keep Test Suite

The test suite in `@sap/ux-app-migrator` should remain as-is to ensure:
- No regressions
- No snapshot changes
- API compatibility maintained

## Step 4: Build and Test

```bash
cd /Users/I320242/Documents/SAPDevelop/tools-suite/packages/lib/app-migrator

# Install the new dependency
yarn install

# Build
yarn build

# Run tests - SHOULD HAVE NO SNAPSHOT CHANGES
yarn test
```

## Step 5: Verify Application-Modeler Extension

```bash
cd /Users/I320242/Documents/SAPDevelop/tools-suite/packages/application-modeler/ide-extension

# Build
yarn build

# Verify imports work
grep -r "@sap/ux-app-migrator" src/
```

## Expected Outcome

- `@sap/ux-app-migrator` becomes a thin wrapper (~50 lines)
- All tests pass with no snapshot changes
- `application-modeler-extension` continues to work
- Full backward compatibility maintained

## Troubleshooting

### If tests fail:
1. Check that all required exports are available from `@sap-ux/fiori-migration-writer`
2. Check for any VS Code-specific code that wasn't migrated
3. Compare the exports before and after

### If snapshots change:
1. Review the changes carefully
2. If they're just whitespace/formatting, update snapshots
3. If they're functional changes, investigate why

### If application-modeler fails to build:
1. Check that all imported types are exported
2. Verify `initI18n`, `MigrationTypes`, `ProjectAccess`, etc. are available

## Quick Commands

```bash
# Build open-ux-tools package
cd /Users/I320242/Documents/SAPDevelop/open-ux-tools/packages/fiori-migration-writer
pnpm build

# Build tools-suite wrapper
cd /Users/I320242/Documents/SAPDevelop/tools-suite/packages/lib/app-migrator  
yarn install
yarn build
yarn test
```
