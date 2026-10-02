# Mem-FS Integration Plan for Fiori Migration Writer

**Date:** October 2, 2026  
**Status:** Ready to implement  
**Estimated effort:** 8-12 hours

## Current State

**✅ Completed:**
- Test projects sanitized and copied (5.7MB, 12 projects)
- All sensitive data removed
- Ready for test development

**❌ Not Yet Done:**
- Mem-fs integration
- Integration tests
- Coverage improvement (currently 11.52%)

## How Other Writers Use Mem-FS

### Pattern Analysis

**Example: `@sap-ux/fiori-freestyle-writer`**

```typescript
// 1. Function signature with optional Editor parameter
async function generate(
    basePath: string,
    data: FreestyleApp,
    fs?: Editor,  // <-- Optional mem-fs editor
    log?: Logger
): Promise<Editor> {  // <-- Returns Editor
    
    // 2. If no editor provided, create one
    if (!fs) {
        const memFs = create();
        fs = createEditor(memFs);
    }
    
    // 3. Use editor for all file operations
    fs.write(join(basePath, 'package.json'), JSON.stringify(pkg));
    fs.copyTpl(templatePath, targetPath, data);
    
    // 4. Return editor (don't commit)
    return fs;
}
```

**Test usage:**
```typescript
test('Generate freestyle app', async () => {
    const testPath = join(tmpdir(), 'test-app');
    const fs = await generate(testPath, config);
    
    // Use fs.dump() for snapshot testing
    expect(fs.dump(testPath)).toMatchSnapshot();
    
    // Optional: Write to disk for debugging
    await new Promise(resolve => {
        fs.commit(resolve);
    });
});
```

### Key Patterns

1. **Optional Editor:** Functions accept `fs?: Editor` parameter
2. **Return Editor:** Always return the Editor for chaining
3. **No Auto-Commit:** Caller decides when to commit
4. **Snapshot Testing:** Use `fs.dump()` for verification

## Migration Writer Adaptation Strategy

### Phase 1: Add Mem-FS Support (4 hours)

**Goal:** Make migration work with both file system and mem-fs

#### 1.1 Update Dependencies

```bash
cd packages/fiori-migration-writer
pnpm add mem-fs@2.1.0 mem-fs-editor@9.4.0
pnpm add -D @types/mem-fs@1.1.2 @types/mem-fs-editor@7.0.1
```

#### 1.2 Create File System Abstraction

**Create `src/utils/fs-adapter.ts`:**

```typescript
import { Editor } from 'mem-fs-editor';
import { create as createMemFs } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import * as fsNode from 'node:fs/promises';
import { join } from 'node:path';

let memFsEditor: Editor | undefined;

/**
 * Enable mem-fs mode with provided editor
 */
export function enableMemFs(editor: Editor): void {
    memFsEditor = editor;
}

/**
 * Disable mem-fs mode (use real file system)
 */
export function disableMemFs(): void {
    memFsEditor = undefined;
}

/**
 * Check if mem-fs mode is enabled
 */
export function isMemFsEnabled(): boolean {
    return memFsEditor !== undefined;
}

/**
 * Get current mem-fs editor (or create one if needed)
 */
export function getOrCreateEditor(): Editor {
    if (!memFsEditor) {
        const store = createMemFs();
        memFsEditor = createEditor(store);
    }
    return memFsEditor;
}

/**
 * Write file (mem-fs or real fs)
 */
export async function writeFile(path: string, content: string): Promise<void> {
    if (memFsEditor) {
        memFsEditor.write(path, content);
    } else {
        await fsNode.writeFile(path, content, 'utf-8');
    }
}

/**
 * Read file (mem-fs or real fs)
 */
export async function readFile(path: string): Promise<string> {
    if (memFsEditor) {
        return memFsEditor.read(path, { raw: false }) as string;
    } else {
        return await fsNode.readFile(path, 'utf-8');
    }
}

/**
 * Copy file (mem-fs or real fs)
 */
export async function copyFile(src: string, dest: string): Promise<void> {
    if (memFsEditor) {
        memFsEditor.copy(src, dest);
    } else {
        await fsNode.copyFile(src, dest);
    }
}

// ... similar wrappers for other operations
```

#### 1.3 Update Main Migration Function

**Update `src/ProjectMigrator.ts`:**

```typescript
import type { Editor } from 'mem-fs-editor';
import { enableMemFs, disableMemFs, isMemFsEnabled } from './utils/fs-adapter.js';

export class ProjectMigrator {
    /**
     * Migrate a project with optional mem-fs support
     * 
     * @param projectPath - Project root path
     * @param hostname - Backend hostname
     * @param ui5SnapshotUrl - UI5 snapshot URL
     * @param projectInfo - Project metadata
     * @param vscode - VS Code API
     * @param internalToggle - Internal features toggle
     * @param fs - Optional mem-fs editor
     * @returns Promise with migration result
     */
    static async migrate(
        projectPath: string,
        hostname: string | undefined,
        ui5SnapshotUrl: string,
        projectInfo?: MigrationUIProjectInfo,
        vscode?: any,
        internalToggle: boolean = false,
        fs?: Editor  // <-- New parameter
    ): Promise<MigrationResult> {
        
        // Enable mem-fs if provided
        if (fs) {
            enableMemFs(fs);
        }
        
        try {
            // Existing migration logic...
            const result = await this.doMigration(/* ... */);
            return result;
        } finally {
            // Disable mem-fs after migration
            if (fs) {
                disableMemFs();
            }
        }
    }
}
```

### Phase 2: Create Integration Tests (4 hours)

**Goal:** Test full migration flows with sanitized projects

#### 2.1 Create Test Helper

**Create `test/helpers/mem-fs-helper.ts`:**

```typescript
import { create as createMemFs } from 'mem-fs';
import { create as createEditor, type Editor } from 'mem-fs-editor';
import { join } from 'node:path';
import { readdirSync, statSync, readFileSync } from 'node:fs';

/**
 * Load a test project into mem-fs
 */
export function loadProjectIntoMemFs(projectPath: string): Editor {
    const store = createMemFs();
    const fs = createEditor(store);
    
    // Recursively copy project into mem-fs
    copyDirectoryToMemFs(projectPath, projectPath, fs);
    
    return fs;
}

function copyDirectoryToMemFs(sourcePath: string, targetPath: string, fs: Editor): void {
    const items = readdirSync(sourcePath);
    
    for (const item of items) {
        const srcPath = join(sourcePath, item);
        const destPath = join(targetPath, item);
        const stats = statSync(srcPath);
        
        if (stats.isDirectory()) {
            if (item !== 'node_modules') {
                copyDirectoryToMemFs(srcPath, destPath, fs);
            }
        } else {
            const content = readFileSync(srcPath);
            fs.write(destPath, content);
        }
    }
}

/**
 * Extract files from mem-fs for verification
 */
export function extractFromMemFs(fs: Editor, basePath: string): Record<string, string> {
    const files: Record<string, string> = {};
    const dump = fs.dump(basePath);
    
    for (const [path, content] of Object.entries(dump)) {
        files[path] = content;
    }
    
    return files;
}
```

#### 2.2 Create Integration Test Suite

**Create `test/integration/migration-flow.test.ts`:**

```typescript
import { describe, test, expect, beforeAll } from '@jest/globals';
import { join } from 'node:path';
import { ProjectMigrator, initI18n } from '../../src/index.js';
import { loadProjectIntoMemFs } from '../helpers/mem-fs-helper.js';
import type { Editor } from 'mem-fs-editor';

const TEST_INPUT = join(__dirname, '../../test/input');

describe('Migration Integration Tests', () => {
    beforeAll(async () => {
        await initI18n();
    });

    describe('LROP v2 Migration', () => {
        test('should migrate tool_suite_beta_lrop_v2_project', async () => {
            const projectPath = join(TEST_INPUT, 'tool_suite_beta_lrop_v2_project');
            const fs = loadProjectIntoMemFs(projectPath);
            
            // Run migration with mem-fs
            await ProjectMigrator.migrate(
                projectPath,
                undefined,
                'https://ui5.sap.com',
                undefined,
                undefined,
                false,
                fs
            );
            
            // Verify generated files
            const ui5Yaml = fs.read(join(projectPath, 'ui5.yaml'));
            expect(ui5Yaml).toContain('fiori-tools-proxy');
            expect(ui5Yaml).toContain('fiori-tools-appreload');
            
            // Snapshot test
            expect(fs.dump(projectPath)).toMatchSnapshot();
        });
    });

    describe('LROP v4 Migration', () => {
        test('should migrate tool_suite_v4_lrop', async () => {
            const projectPath = join(TEST_INPUT, 'tool_suite_v4_lrop');
            const fs = loadProjectIntoMemFs(projectPath);
            
            await ProjectMigrator.migrate(
                projectPath,
                undefined,
                'https://ui5.sap.com',
                undefined,
                undefined,
                false,
                fs
            );
            
            const ui5Yaml = fs.read(join(projectPath, 'ui5.yaml'));
            expect(ui5Yaml).toBeDefined();
            expect(fs.dump(projectPath)).toMatchSnapshot();
        });
    });

    describe('OVP Migration', () => {
        test('should migrate webide_v2_ovp_project', async () => {
            const projectPath = join(TEST_INPUT, 'webide_v2_ovp_project');
            const fs = loadProjectIntoMemFs(projectPath);
            
            await ProjectMigrator.migrate(
                projectPath,
                undefined,
                'https://ui5.sap.com',
                undefined,
                undefined,
                false,
                fs
            );
            
            expect(fs.dump(projectPath)).toMatchSnapshot();
        });
    });

    // Add tests for remaining 9 projects...
});
```

### Phase 3: Update Existing Tests (2-3 hours)

**Goal:** Make existing unit tests work with test fixtures

#### 3.1 Update ui5-config-adapter Tests

**Current:**
```typescript
test('should generate ui5.yaml', async () => {
    const data = createTestData();
    const yaml = await generateUI5YamlContent(data);
    expect(yaml).toContain('fiori-tools-proxy');
});
```

**With fixtures:**
```typescript
test('should generate ui5.yaml from real project', async () => {
    const projectPath = join(TEST_INPUT, 'tool_suite_beta_lrop_v2_project');
    const manifest = await readJSON(join(projectPath, 'webapp', 'manifest.json'));
    
    const data = await assembleTemplateData(manifest, projectPath);
    const yaml = await generateUI5YamlContent(data);
    
    expect(yaml).toContain('fiori-tools-proxy');
    expect(yaml).toMatchSnapshot();
});
```

### Phase 4: Snapshot Validation (1-2 hours)

**Goal:** Ensure outputs match tools-suite exactly

#### 4.1 Create Snapshot Comparison Script

**Create `scripts/compare-snapshots.sh`:**

```bash
#!/bin/bash
# Compare generated outputs between tools-suite and open-ux-tools

TOOLS_SUITE="/Users/I320242/Documents/SAPDevelop/tools-suite/packages/lib/app-migrator"
OPEN_UX="/Users/I320242/Documents/SAPDevelop/open-ux-tools/packages/fiori-migration-writer"

PROJECTS=(
    "tool_suite_beta_lrop_v2_project"
    "tool_suite_v4_lrop"
    # ... others
)

for project in "${PROJECTS[@]}"; do
    echo "Comparing: $project"
    
    # Compare ui5.yaml
    diff -u \
        "$TOOLS_SUITE/test/__snapshots__/$project/ui5.yaml" \
        "$OPEN_UX/test/__snapshots__/$project/ui5.yaml"
    
    # Compare package.json
    diff -u \
        "$TOOLS_SUITE/test/__snapshots__/$project/package.json" \
        "$OPEN_UX/test/__snapshots__/$project/package.json"
done
```

## Expected Outcomes

### Coverage Improvement
- **Before:** 11.52%
- **After:** 40-50% (with integration tests)
- **Long-term:** 60-70% (with comprehensive unit tests)

### Test Execution
- **Unit tests:** ~15 sec (93 tests)
- **Integration tests:** ~30 sec (12 projects)
- **Total:** ~45 sec (vs 40 min E2E in tools-suite)

### File Structure
```
packages/fiori-migration-writer/
├── src/
│   ├── utils/
│   │   └── fs-adapter.ts          # NEW: File system abstraction
│   ├── ProjectMigrator.ts          # UPDATED: Add fs parameter
│   └── index.ts                    # UPDATED: Export fs adapter
├── test/
│   ├── input/                      # NEW: 12 sanitized projects (5.7MB)
│   ├── integration/                # NEW: Integration test suite
│   │   └── migration-flow.test.ts
│   ├── helpers/
│   │   └── mem-fs-helper.ts        # NEW: Mem-fs test utilities
│   ├── unit/                       # Existing unit tests
│   └── __snapshots__/              # NEW: Snapshot files
└── package.json                    # UPDATED: Add mem-fs dependencies
```

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Snapshots diverge from tools-suite | High | Byte-for-byte comparison script |
| Mem-fs changes behavior | High | Keep both modes, extensive testing |
| Tests take too long | Medium | Use minimal fixtures (5.7MB not 490MB) |
| Coverage still low | Low | Accept 40-50%, tools-suite has E2E |

## Success Criteria

- [ ] Mem-fs adapter implemented
- [ ] All file operations use adapter
- [ ] 12 integration tests passing
- [ ] Snapshots validated against tools-suite
- [ ] Coverage > 40%
- [ ] Test execution < 1 minute
- [ ] No regressions in tools-suite tests

## Timeline

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| 1. Mem-fs adapter | 4 hours | None |
| 2. Integration tests | 4 hours | Phase 1 |
| 3. Update unit tests | 2-3 hours | Phase 2 |
| 4. Snapshot validation | 1-2 hours | Phase 3 |
| **Total** | **11-13 hours** | - |

## Next Steps

1. **Start with Phase 1:** Create fs-adapter.ts
2. **Test adapter:** Verify it works with one project
3. **Create one integration test:** Prove the concept
4. **Expand:** Add remaining 11 integration tests
5. **Validate:** Compare all snapshots with tools-suite

**Ready to begin:** All prerequisites complete ✅
