# Refactor Plan: Pure mem-fs-editor Pattern

## Goal
Align fiori-migration-writer with other open-ux-tools writers by:
1. Removing all direct node:fs usage
2. Using only mem-fs-editor for file operations
3. Removing fs-adapter switching logic

## Files to Modify (8 files)

### 1. DELETE: src/utils/fs-adapter.ts
- Remove entire file
- This is the adapter that switches between fs and mem-fs

### 2. REFACTOR: src/utils/file-access.ts
**Current:** Dual mode (node:fs OR mem-fs via adapter)
**Target:** Pure mem-fs-editor
- Remove: `import { promises as fs } from 'node:fs'`
- Remove: `import * as fsAdapter from './fs-adapter.js'`
- Change all functions to accept `Editor` parameter
- Use only `fs.read()`, `fs.write()`, `fs.exists()`

### 3. REFACTOR: src/ProjectMigrator.ts
**Current:** Uses existsSync, readdirSync
**Changes:**
- Remove: `import { existsSync, readdirSync } from 'node:fs'`
- Line 327: `existsSync(yamlPath)` → `fs.exists(yamlPath)`
- Line 357: `existsSync(webappFullPath)` → `fs.exists(webappFullPath)`
- readdirSync calls → use mem-fs equivalent

### 4. REFACTOR: src/migration-process/setup.ts
**Current:** Uses existsSync
**Changes:**
- Remove: `import { existsSync } from 'node:fs'`
- Line 28: `existsSync(webAppPath)` → `fs.exists(webAppPath)`
- Add `fs: Editor` parameter

### 5. REFACTOR: src/migration-process/legacy-helpers.ts
**Current:** 7 existsSync calls, 1 readdirSync
**Changes:**
- Remove: `import { existsSync } from 'node:fs'`
- Lines 24, 113, 118, 143, 146, 149, 174: Replace with fs.exists()
- Line 174: `fs.default.readdirSync(dir)` needs investigation

### 6. REFACTOR: src/utils/file-system-utils.ts
**Current:** Uses existsSync
**Changes:**
- Remove: `import { existsSync } from 'node:fs'`
- Line 35: `existsSync(directory)` → `fs.exists(directory)`
- Add `fs: Editor` parameter

### 7. REFACTOR: src/files/webapp.ts
**Current:** Uses existsSync, readdirSync
**Changes:**
- Remove: `import { existsSync, readdirSync } from 'node:fs'`
- Replace with mem-fs-editor equivalents

### 8. REFACTOR: src/utils/project-readers/webapp-path-resolver.ts
**Current:** Uses existsSync
**Changes:**
- Remove: `import { existsSync } from 'node:fs'`
- Replace with fs.exists()

## mem-fs-editor API Reference

```typescript
// File existence
fs.exists(path: string): boolean

// Read file
fs.read(path: string): string
fs.read(path: string, options: { raw: true }): Buffer

// Write file
fs.write(path: string, contents: string | Buffer): void

// Copy
fs.copy(from: string, to: string): void
fs.copyTpl(from: string, to: string, context: any): void

// Delete
fs.delete(paths: string | string[]): void

// Commit changes to disk
fs.commit(callback: (err?: Error) => void): void
```

## Implementation Strategy

1. **Phase 1:** Update file-access.ts (core utilities)
2. **Phase 2:** Update ProjectMigrator.ts (main entry)
3. **Phase 3:** Update migration-process files
4. **Phase 4:** Update utils and files
5. **Phase 5:** Delete fs-adapter.ts
6. **Phase 6:** Run tests and fix issues

## Expected Test Changes
- Tests already use mem-fs, so should mostly work
- May need to adjust some test setup/teardown
- Coverage should remain ~65%
