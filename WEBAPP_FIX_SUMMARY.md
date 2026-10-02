# Webapp Test Fix Summary - October 2, 2026

## Issue Fixed

webapp.test.ts had a failing test: "should create manifest at root if webapp does not exist"

## Root Cause

The `exists()` function in `fs-adapter.ts` was only checking mem-fs-editor, but tests were creating real directories on disk using Node.js `mkdir()`. This caused a mismatch:

1. Tests created real directories with `mkdir()` from `node:fs/promises`
2. The `exists()` function only checked mem-fs
3. Real directories weren't visible to mem-fs
4. Code logic failed to detect existing directories

## Solution

Modified `exists()` in `src/utils/fs-adapter.ts` to check BOTH mem-fs and real filesystem:

```typescript
export function exists(path: string): boolean {
    const fs = getOrCreateEditor();
    // Check mem-fs first, then fall back to real filesystem
    return fs.exists(path) || existsSync(path);
}
```

Also simplified the logic in `src/files/webapp.ts`:

```typescript
// Before (incorrect):
const shouldWriteToWebapp =
    projectInfo.webappPath && (isMemFsEnabled() || exists(join(rootPath, projectInfo.webappPath)));

// After (correct):
const shouldWriteToWebapp =
    projectInfo.webappPath && exists(join(rootPath, projectInfo.webappPath));
```

The `isMemFsEnabled()` check was causing short-circuiting - it would skip the `exists()` check entirely when mem-fs was enabled, assuming the directory always exists.

## Files Changed

1. **src/utils/fs-adapter.ts**
   - Added `existsSync` import from `node:fs`
   - Modified `exists()` to check both mem-fs and real filesystem
   - Added documentation explaining the dual-check strategy

2. **src/files/webapp.ts**
   - Simplified `shouldWriteToWebapp` logic
   - Removed unnecessary `isMemFsEnabled()` check
   - Removed unused `isMemFsEnabled` import

## Test Results

- **Before:** 15/16 tests passing (1 failure)
- **After:** 16/16 tests passing ✅

All webapp tests now pass:
- Extension manifest creation
- Webapp path handling
- File migration
- Path validation
- Git integration

## Why This Approach?

The dual-check strategy (`mem-fs || real fs`) supports mixed testing scenarios:

1. **Pure mem-fs tests:** Create files in mem-fs → `exists()` finds them
2. **Real directory tests:** Create directories with node:fs → `exists()` finds them via `existsSync()`
3. **Migration flows:** May use both → both checks ensure correct behavior

This aligns with how the migration writer is used:
- **In tests:** Mix of mem-fs and real filesystem operations
- **In production:** Primarily mem-fs with real fs fallback
- **In tools-suite integration:** Real filesystem operations

## Commit

```
fix(fiori-migration-writer): make exists() check both mem-fs and real fs

- exists() now checks both mem-fs-editor and real filesystem
- Fixes webapp directory detection in mixed testing scenarios
- Ensures webappPath is correctly cleared when directory doesn't exist
- All 16 webapp tests now passing
```

Commit hash: `72ef0bc`

## Next Steps

1. ✅ Run full test suite to ensure no regressions
2. ⏳ Sync to tools-suite once validated
3. ⏳ Continue with coverage improvement work

---

**Status:** ✅ Complete  
**Branch:** `feat/fiori-migration-writer/add-missing-exports`  
**All webapp tests passing:** 16/16
