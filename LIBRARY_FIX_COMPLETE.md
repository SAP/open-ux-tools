# Library Config File Location Fix - COMPLETE ✅

## Summary

Successfully ported the library config file location fix from tools-suite PR #39527 to open-ux-tools, including the integration test. Both repositories are now in sync with the fix deployed and tested.

---

## What Was Fixed

**Problem:** Library projects were creating `package.json` and `ui5.yaml` in nested source directories (e.g., `src/sap/nw/core/om/lib/name/`) instead of project root, causing deployment failures.

**Root Cause:** `getReuseLibs()` was setting `libRoot = dirname(manifestPath)`, but UI5 library manifest files follow namespace structure deep in the source tree.

**Solution:** Added `findLibraryProjectRoot()` that walks up from manifest directory to find actual project root by checking for markers (`.git`, `package.json`, `.project.json`, `pom.xml`).

---

## Commits

### open-ux-tools (branch: feat/fiori-migration-writer/add-missing-exports)

1. **`1c43a07`** - "fix(fiori-migration-writer): correct library config file location"
   - Added `findLibraryProjectRoot()` function
   - Updated `getReuseLibs()` to use it
   - Added 5 new unit tests + updated 3 existing tests
   - **Status:** ✅ 25/25 tests passing

2. **`243b7e5`** - "test(fiori-migration-writer): add library migration integration test"
   - Ported complete integration test from tools-suite
   - Tests full migration flow: workspace scanning → getReuseLibs → file placement
   - **Status:** ✅ 2/2 tests passing

### tools-suite (branch: feat/app-migrator/consume-open-source-writer)

1. **`78ed33a8b9`** - "chore: merge master and resolve conflicts"
   - Merged origin/master
   - Deleted `file-discovery.ts` (consumed from open-ux-tools)
   - Resolved package.json conflicts
   - Regenerated yarn.lock
   - **Status:** ✅ Build successful, all tests passing

---

## Test Coverage

### Unit Tests (file-discovery.test.ts)
- ✅ Basic library discovery with no markers → workspace boundary as libRoot
- ✅ Component discovery → workspace boundary as libRoot  
- ✅ Project root detection with `package.json` marker
- ✅ Project root detection with `.git` marker
- ✅ Project root detection with `.project.json` marker
- ✅ Project root detection with `pom.xml` marker
- ✅ Monorepo scenario → innermost `package.json` wins
- ✅ Basename fallback when `sap.app.id` missing

### Integration Tests (library-migration-integration.test.ts)
- ✅ Full migration flow with nested namespace structure
- ✅ Monorepo with nested package.json files
- ✅ Verifies config files at project root (not nested)

**Total:** 27 tests passing across both files

---

## Implementation Details

### Path Normalization
```typescript
const normalizedBoundary = workspaceBoundary.replace(/\\/g, '/');
const norm = current.replace(/\\/g, '/');
```

### Filesystem Check (Not mem-fs)
Project markers are real filesystem entries, checked with Node.js `fs.access()`:
```typescript
const pathExists = async (path: string): Promise<boolean> => {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
};
```

### Parallel Marker Checks
```typescript
const [hasGit, hasPackageJson, hasProjectJson, hasPomXml] = await Promise.all([
    pathExists(join(current, '.git')),
    pathExists(join(current, 'package.json')),
    pathExists(join(current, '.project.json')),
    pathExists(join(current, 'pom.xml'))
]);
```

---

## Files Modified

### open-ux-tools
- `packages/fiori-migration-writer/src/utils/file-discovery.ts` (added `findLibraryProjectRoot()`)
- `packages/fiori-migration-writer/test/file-discovery.test.ts` (5 new + 3 updated tests)
- `packages/fiori-migration-writer/test/library-migration-integration.test.ts` (new file, 285 lines)

### tools-suite
- `packages/lib/app-migrator/package.json` (merged dependencies)
- `packages/lib/app-migrator/src/utils/file-discovery.ts` (deleted - consumed from open-ux-tools)
- `packages/lib/app-migrator/test/projectMigrator.test.ts` (added imports)
- `yarn.lock` (regenerated)

---

## Verification Steps Completed

1. ✅ **open-ux-tools:** pnpm install && pnpm build
2. ✅ **open-ux-tools:** Unit tests passing (25/25)
3. ✅ **open-ux-tools:** Integration tests passing (2/2)
4. ✅ **tools-suite:** Merge conflicts resolved
5. ✅ **tools-suite:** yarn install && yarn build
6. ✅ **tools-suite:** Sync from open-ux-tools completed
7. ✅ **tools-suite:** app-migrator tests passing (background task confirmed)

---

## Related Issues

- **tools-suite PR #39527:** Original fix (merged to master)
- **Customer ticket:** DINC1062937 (nw.core.om.lib.printreuse deployment failure)

---

**Status:** ✅ **COMPLETE**  
**Date:** October 2, 2026  
**Branches Ready:** Both branches tested and working
