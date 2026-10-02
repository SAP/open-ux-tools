# mem-fs Refactor - Final Status

## 🎯 Objective
Align fiori-migration-writer with other open-ux-tools writers by using pure mem-fs-editor (no node:fs).

## ✅ Completed Refactoring

### Core Files Refactored (5 files):
1. ✅ **src/utils/file-access.ts** - Pure mem-fs-editor
   - All functions use mem-fs-editor (readFile, writeFile, readJSON, updateJSON, etc.)
   - Support dual API: `fn(path)` and `fn(fs, path)`
   - Removed: `import { promises as fs } from 'node:fs'`

2. ✅ **src/utils/fs-adapter.ts** - Simplified to pure mem-fs
   - Removed all real fs fallback code
   - Provides: `exists()`, `copyFile()`, `deleteFile()`, `mkdir()`, `commit()`
   - Manages global Editor instance
   - Removed: All node:fs imports

3. ✅ **src/utils/file-system-utils.ts** - Uses mem-fs-editor
   - `doesDirectoryExists()` uses fs.exists()
   - `createDirectory()` is now a no-op (mem-fs handles implicitly)
   - Removed: `import { existsSync } from 'node:fs'`

4. ✅ **src/migration-process/setup.ts** - Uses fileExists
   - Replaced `existsSync(webAppPath)` with `fileExists(webAppPath)`
   - Removed: `import { existsSync } from 'node:fs'`

5. ✅ **src/utils/project-readers/webapp-path-resolver.ts** - Uses fileExists
   - Replaced 2 `existsSync()` calls with `fileExists()`
   - Removed: `import { existsSync } from 'node:fs'`

## ⚠️ Remaining Files with node:fs (3 files)

These files use `readdirSync()` which has no direct mem-fs equivalent:

### 1. src/ProjectMigrator.ts
- Line 7: `import { existsSync, readdirSync } from 'node:fs'`
- Line 327: `existsSync(yamlPath)` - **Can replace** with `fileExists()`
- Lines 357-360: `readdirSync(webappFullPath, { recursive: true })` - **Complex**
  - Used to detect TypeScript files recursively
  - mem-fs doesn't have recursive directory listing
  - **Options:**
    a. Use mem-fs store iteration
    b. Keep this one node:fs call (minimal impact)
    c. Use @sap-ux/project-access helper

### 2. src/files/webapp.ts
- Line 6: `import { existsSync, readdirSync } from 'node:fs'`
- Line 123: `readdirSync(rootPath, { withFileTypes: true })`
  - Used to move files into webapp folder
  - mem-fs has `fs.store.each()` but different API
  - **Complex refactor needed**

### 3. src/migration-process/legacy-helpers.ts
- Line 3: `import { existsSync } from 'node:fs'`
- Lines 24, 113, 118, 143, 146, 149: `existsSync()` - **Can replace** with `fileExists()`
- Line 174: `fs.default.readdirSync(dir)` - **Complex**

## 📊 Current Test Status

### Tests:
- **10/14 test suites passing** (71%)
- **129/147 tests passing** (88%)  
- **4 test files failing:**
  1. file-access-utils.test.ts (expects async API, got sync)
  2. migration-flow-integration.test.ts (11 snapshot failures)
  3. project-files.test.ts (API changes)
  4. webapp.test.ts (API changes)

### Lint:
- 99 errors (mostly import/no-unresolved in tests)
- 909 warnings (expected, not blocking)

## 🎯 Next Steps

### Option A: Complete Refactor (3-4 hours)
1. Replace remaining `existsSync` calls with `fileExists` (easy)
2. Refactor `readdirSync` usage:
   - ProjectMigrator: Use mem-fs store iteration or keep one call
   - webapp.ts: Use `fs.store.each()` pattern
   - legacy-helpers.ts: Use fileExists + mem-fs iteration
3. Fix 4 failing test files
4. Update snapshots
5. Verify all tests pass

### Option B: Hybrid Approach (Recommended - 1 hour)
1. Replace easy `existsSync` calls (10 min)
2. **Keep `readdirSync` for now** in 3 files with comment:
   ```typescript
   // TODO: Refactor to use mem-fs store.each() - requires more complex changes
   import { readdirSync } from 'node:fs';
   ```
3. Fix failing tests (30 min)
4. Document remaining work (10 min)

**Rationale for Option B:**
- 5/8 files already refactored (62.5% done)
- Core pattern established
- `readdirSync` is used in 3 specific places for directory traversal
- mem-fs doesn't have direct equivalent - needs store iteration
- Can be completed in follow-up PR
- Tests already use pure mem-fs

## 📈 Benefits Achieved So Far

✅ **Consistency** - Core file operations now match other writers  
✅ **Simplicity** - Removed dual-mode switching logic  
✅ **Testability** - Tests use pure mem-fs  
✅ **Architecture** - Aligns with open-ux-tools pattern  

## 📝 Commits

1. `b68446a` - wip: refactor file-access, fs-adapter, file-system-utils
2. `0561f7b` - refactor: update setup.ts and webapp-path-resolver.ts

## 🔍 Files Using node:fs Summary

**Before refactor:** 8 files, 28 usage locations  
**After refactor:** 3 files, 10 usage locations (3 readdirSync, 7 existsSync)  
**Reduction:** 62.5% of files, 64% of usage locations

---

**Recommendation:** Proceed with **Option B** - replace remaining existsSync, document readdirSync as TODO, fix tests, and ship.
