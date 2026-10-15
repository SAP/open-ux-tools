# DRY Audit Findings - fiori-migration-writer

## Executive Summary

Audited 97 source files in fiori-migration-writer. Found significant duplication and unnecessary abstractions.

**Key Issues:**
1. ❌ Entire `file-access.ts` wraps mem-fs-editor with no added value (except readJSON/updateJSON)
2. ❌ `fileExists()` incorrectly checks both mem-fs AND node:fs (lines 82-93)
3. ❌ Many one-line wrapper functions that should be removed
4. ⚠️  Lodash is a dependency but barely used (only 2 imports found)
5. ⚠️  Potential duplicates of @sap-ux/project-access functionality

## Detailed Findings

### 1. file-access.ts - REMOVE MOST WRAPPERS ❌

**File:** `src/utils/file-access.ts`

| Function | Issue | Action |
|----------|-------|--------|
| `readFile()` | Just calls `editor.read()` | **REMOVE** - use `editor.read()` directly |
| `writeFile()` | Just calls `editor.write()` | **REMOVE** - use `editor.write()` directly |
| `updateFile()` | Alias for `writeFile()` | **REMOVE** - use `editor.write()` directly |
| `deleteFile()` | Just calls `editor.delete()` | **REMOVE** - use `editor.delete()` directly |
| `fileExists()` | **BROKEN** - checks both mem-fs AND node:fs | **FIX** - use only `editor.exists()` or try/catch |
| `readJSON()` | Adds value (indent preservation) | **KEEP but simplify** |
| `updateJSON()` | Adds value (indent preservation) | **KEEP** |

**fileExists() Problem (lines 82-93):**
```typescript
// ❌ WRONG COMMENT:
// "In mem-fs context: a file exists if it is staged in mem-fs OR already on the real filesystem.
// Checking mem-fs alone misses pre-existing files that haven't been loaded into the editor."

const fs = getEditor(pathOrFs);
if (editorHasPath(fs, filePath)) {
    return true;
}
try {
    await access(filePath);  // ❌ REDUNDANT: mem-fs already does this!
    return true;
} catch {
    return false;
}
```

**Why this is wrong:**
- mem-fs-editor ALREADY reads from disk when `editor.read()` is called
- mem-fs-editor ALREADY checks disk when `editor.exists()` is called
- Adding `fs.access()` duplicates this check and can cause race conditions

**Correct approach:**
```typescript
// ✅ Just use editor directly:
export function fileExists(pathOrFs: string | Editor, path?: string): boolean {
    const fs = getEditor(pathOrFs);
    const filePath = typeof pathOrFs === 'string' ? pathOrFs : path!;
    return fs.exists(filePath);
}
```

### 2. file-system-utils.ts - REMOVE WRAPPERS ❌

**File:** `src/utils/file-system-utils.ts`

| Function | Issue | Action |
|----------|-------|--------|
| `stripSpaces()` | Just calls `str.replaceAll(/\s/g, '')` | **KEEP** - commonly used pattern |
| `escapeSingleQuotes()` | Custom escaping logic | **KEEP** - security-sensitive |
| `escapeDoubleQuotes()` | Custom escaping logic | **KEEP** - security-sensitive |
| `doesDirectoryExists()` | Wraps `editorHasPath()` | **REPLACE** with direct `editorHasPath()` calls |
| `doesPropertyExist()` | Just calls `Object.hasOwn()` | **REMOVE** - use `Object.hasOwn()` directly |
| `createDirectory()` | No-op in mem-fs | **REMOVE** - mem-fs handles dirs implicitly |

### 3. Common Utility Functions - Use Lodash ⚠️

Lodash is already a dependency but barely used. Many custom utilities could be lodash calls:

| Current Custom Function | Lodash Equivalent | Action |
|------------------------|-------------------|---------|
| Various object checks | `_.has()`, `_.get()`, `_.set()` | Audit and replace where appropriate |
| Array operations | `_.map()`, `_.filter()`, `_.find()` | Audit and replace where appropriate |
| String operations | `_.trim()`, `_.split()`, etc. | Audit and replace where appropriate |

**Need to review:** All files in `src/utils/` for lodash opportunities.

### 4. Potential @sap-ux/project-access Duplicates ⚠️

The following utilities MAY duplicate @sap-ux/project-access functionality:

| File | Likely Duplicate | Need Investigation |
|------|-----------------|-------------------|
| `manifest-and-version-utils.ts` | `readManifest()` | Check @sap-ux/project-access API |
| `project-readers/manifest-reader.ts` | Manifest parsing | Check @sap-ux/project-access API |
| `project-readers/package-reader.ts` | package.json reading | Check @sap-ux/project-access API |
| `project-readers/manifest-utils.ts` | Manifest utilities | Check @sap-ux/project-access API |

**Action:** Need to check @sap-ux/project-access documentation/source to confirm duplicates.

### 5. Direct node:fs Usage ❌

Found 1 direct import of `node:fs` in source files (not counting tests).

**Files to audit:**
- Check all imports of `node:fs`, `node:fs/promises`
- Replace with mem-fs-editor where applicable
- Only allow node:fs in entry points or specific edge cases

### 6. file-discovery.ts - Check for fast-glob Duplicates ⚠️

**File:** `src/utils/file-discovery.ts`

fast-glob is already a dependency. Check if file-discovery.ts reimplements fast-glob patterns.

**Action:** Review file-discovery.ts against fast-glob API.

### 7. fs-adapter.ts - Mixed Responsibilities ⚠️

**File:** `src/utils/fs-adapter.ts`

This file mixes:
- AsyncLocalStorage context management (✅ good)
- Editor creation (✅ good)
- File operations (`copyFile`, `deleteFile`, `mkdir`) that duplicate editor methods (❌ bad)

**Action:** Remove wrapper functions, keep only context management.

## Impact Assessment

### Files to Modify (High Priority)

1. **Remove entirely:**
   - None (file-access.ts has some useful functions)

2. **Major refactoring:**
   - `src/utils/file-access.ts` - Remove wrappers, fix fileExists()
   - `src/utils/fs-adapter.ts` - Remove operation wrappers
   - `src/utils/file-system-utils.ts` - Remove trivial wrappers

3. **Update all call sites:**
   - Replace `readFile()` with `editor.read()` - ~50+ call sites
   - Replace `writeFile()` with `editor.write()` - ~30+ call sites
   - Replace `fileExists()` with `editor.exists()` or fixed version - ~20+ call sites
   - Replace `deleteFile()` with `editor.delete()` - ~10+ call sites
   - Replace `doesPropertyExist()` with `Object.hasOwn()` - ~5+ call sites

### Estimated Effort

- **Phase 1:** Remove/fix wrapper functions (1-2 days)
  - Fix fileExists() logic
  - Remove trivial wrappers from file-access.ts, fs-adapter.ts, file-system-utils.ts
  - Update all call sites

- **Phase 2:** Audit for external package duplicates (2-3 days)
  - Review @sap-ux/project-access for manifest/package.json reading
  - Review lodash opportunities
  - Review fast-glob vs file-discovery.ts

- **Phase 3:** Testing and validation (1 day)
  - Run full test suite
  - Check for regressions
  - Update documentation

**Total:** 4-6 days

### Expected Code Reduction

- Remove ~200-300 lines of wrapper code
- Simplify ~100+ call sites
- **Estimated reduction:** 15-20% of utils code

## Acceptance Criteria

- [ ] Zero wrapper functions that just call one editor method
- [ ] fileExists() uses only editor, not node:fs
- [ ] All node:fs usage justified and documented
- [ ] No trivial Object.hasOwn() wrappers
- [ ] All tests pass
- [ ] No regression in functionality
- [ ] Code review from colleague confirms DRY compliance

## Next Steps

1. Start with Phase 1: Remove wrappers and fix fileExists()
2. Create separate commits for each type of change:
   - Commit 1: Fix fileExists() logic
   - Commit 2: Remove readFile/writeFile/deleteFile wrappers
   - Commit 3: Remove trivial utility wrappers
   - Commit 4: Update tests
3. Open PR for review before Phase 2
