# Open UX Tools Test Status - Fiori Migration Writer

## Current Situation

The test files created in the previous session (1,100+ lines) were **scaffolding** - they test functions that don't exist yet in the source code. This was premature test creation without implementation.

## ✅ Fixed Issues
1. **ESM compatibility** - Replaced `require()` with proper ES module imports
   - `test/helpers/test-project-builder.ts`: Now uses `existsSync` from `node:fs`
   - `test/file-discovery.test.ts`: Now uses `symlinkSync` from `node:fs`

## ❌ Remaining Blockers

### 1. Missing Functions in Source Code

The following test imports reference functions that **don't exist**:

#### `detectProjectType` (from `src/utils/file-discovery.ts`)
- **Tests using it:** `test/file-discovery.test.ts`
- **Status:** Function not implemented in source
- **What exists:** `findAllProjectRoots`, `getReuseLibs`, `findAll`
- **Fix needed:** Either implement the function or remove/skip tests

#### `generateUI5Config` (from `src/config/ui5-yaml.ts`)
- **Tests using it:** `test/ui5-yaml.test.ts`
- **Status:** Function not implemented in source
- **What exists:** `generateAndWriteUI5Yaml`, `generateAndWriteUI5LocalYaml`, etc.
- **Fix needed:** Either implement the function or remove/skip tests

#### `migrateAll` method (from `BulkProjectMigrator`)
- **Tests using it:** `test/BulkProjectMigrator.test.ts`
- **Status:** Method doesn't exist - the class has `migrate()` instead
- **What exists:** `migrate(projects, ui5SnapshotUrl, vscode?, internalToggle?)`
- **Fix needed:** Update tests to use `migrate()` instead

### 2. Test Implementation Gaps

Many tests have TODO or incomplete implementation:
- File access tests
- Project migration tests
- Bulk migration tests

## Current Test Results

```bash
pnpm test
```

**All tests failing** due to missing function imports and implementation gaps.

## Recommended Path Forward

### Option A: Complete Implementation First (RECOMMENDED)
1. Wait for E2E Round 2 to complete in tools-suite
2. Identify what's actually working in tools-suite app-migrator
3. Sync working code from tools-suite to open-ux-tools
4. Write tests that match the actual API surface
5. Achieve 80%+ coverage on **what exists**

### Option B: Implement Missing Functions
1. Implement `detectProjectType` in `src/utils/file-discovery.ts`
2. Implement `generateUI5Config` in `src/config/ui5-yaml.ts`
3. Rename or add `migrateAll()` wrapper in `BulkProjectMigrator`
4. Then make tests work

### Option C: Skip Incomplete Tests
1. Comment out or `.skip()` tests for unimplemented functions
2. Focus on testing what's actually implemented
3. Gradually add tests as features are implemented

## What Actually Exists to Test

Based on `src/` directory inspection:

### ✅ Can Be Tested Now
- `ProjectMigrator.migrate()` - main migration entry point
- `BulkProjectMigrator.migrate()` - bulk migration (not `migrateAll`)
- File access utils in `src/utils/file-access.ts`
- File discovery: `findAllProjectRoots`, `getReuseLibs` in `src/utils/file-discovery.ts`
- Config writers: `generateAndWriteUI5Yaml`, etc. in `src/config/ui5-yaml.ts`
- Migration process phases in `src/migration-process/`
- Template system in `src/template/`

### ❌ Cannot Be Tested Yet (Don't Exist)
- `detectProjectType` - not implemented
- `generateUI5Config` - not implemented (only `generateAndWriteUI5Config` exists)
- `migrateAll()` method - doesn't exist

## Tools-Suite Master as Benchmark

**Critical:** The tools-suite package (`@sap/ux-app-migrator`) is the source of truth. We should:

1. Check what's actually exported from tools-suite
2. Sync the working code to open-ux-tools
3. Write tests that match the actual implementation
4. Never deviate from tools-suite master snapshots

## Action Items

### Immediate (While E2E Runs)
- [x] Fix ESM issues (require → import)
- [ ] Document what actually exists vs what tests expect
- [ ] Decide: Implement missing functions OR skip incomplete tests

### After E2E Round 2
- [ ] Analyze E2E results
- [ ] Run E2E Round 3 (diverse project types)
- [ ] Sync latest tools-suite code to open-ux-tools
- [ ] Write tests for actual API surface
- [ ] Achieve 80%+ coverage on existing code
- [ ] Validate snapshots against tools-suite master

## Test Coverage Strategy

Instead of 1,100+ lines of tests for non-existent functions, focus on:

1. **Core Migration Flow** - End-to-end migration tests using real test fixtures
2. **Config Writers** - Test each config file generation
3. **File Discovery** - Test what actually exists (findAllProjectRoots, getReuseLibs)
4. **Template System** - Test template application
5. **Error Handling** - Test failure scenarios

Target: **80%+ coverage on implemented code**, not aspirational APIs.
