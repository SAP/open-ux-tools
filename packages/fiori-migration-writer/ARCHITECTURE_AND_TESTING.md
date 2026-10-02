# Open-UX-Tools Architecture & Testing Strategy

## Architecture Overview (Writer-Based Approach)

### ✅ **Current State: Modern UI5Config API**

The `fiori-migration-writer` package has been **refactored away from EJS templates** to use the programmatic `@sap-ux/ui5-config` API for configuration file generation.

```
┌─────────────────────────────────────────┐
│     @sap-ux/ui5-config (Core API)       │
│  • UI5Config.newInstance()              │
│  • addFioriToolsProxyMiddleware()       │
│  • addUI5Framework()                    │
│  • toString() → YAML                    │
└─────────────────────────────────────────┘
                  ↑
                  │ Uses (shared)
                  │
        ┏━━━━━━━━━┻━━━━━━━━━┓
        ↓                    ↓
┌──────────────────┐  ┌────────────────────────┐
│ ui5-application- │  │ fiori-migration-writer │
│ writer           │  │                        │
│ (NEW apps)       │  │ (MIGRATION)            │
│                  │  │ • ui5-config-adapter   │
│ UNCHANGED        │  │ • Migration-specific   │
└──────────────────┘  └────────────────────────┘
```

### Key Architectural Decisions

1. **✅ Config files use UI5Config API** - No more EJS templates for YAML
   - `ui5.yaml` - Generated programmatically
   - `ui5-local.yaml` - Generated programmatically  
   - `ui5-mock.yaml` - Generated programmatically

2. **⚠️ HTML/JS files still use templates** - Migration-specific requirements
   - `flpSandbox.html` - Has `rootIntent` conditional logic
   - `Component.js` - V2 Fiori Elements specific
   - `index.html` - Bootstrap URL handling

3. **⚠️ package.json partially programmatic** - Hybrid approach
   - Can use `mockserver-config-writer` for dependencies
   - Must keep migration logic for scripts (OData v2 vs v4 awareness)

## What This Means for Testing

### ❌ **Previous Approach Was Wrong**

The tests created in the previous session (1,100+ lines) were:
- Testing functions that don't exist (`detectProjectType`, `generateUI5Config`)
- Testing aspirational APIs, not the actual implementation
- Written before understanding the writer-based architecture

### ✅ **Correct Testing Approach**

#### 1. **Test the Adapters** (Core Logic)

```typescript
// test/ui5-config-adapter.test.ts
describe('UI5Config Adapter', () => {
    test('should generate ui5.yaml with proxy middleware', async () => {
        const templateData = createTestTemplateData({
            backends: [{ path: '/sap', url: 'https://backend.com' }]
        });
        
        const yaml = await generateUI5YamlContent(templateData);
        
        expect(yaml).toContain('specVersion: \'4.0\'');
        expect(yaml).toContain('fiori-tools-proxy');
        expect(yaml).toContain('https://backend.com');
    });
});
```

#### 2. **Test Migration Flow End-to-End**

```typescript
// test/ProjectMigrator.test.ts
describe('ProjectMigrator', () => {
    test('should migrate LROP v2 project', async () => {
        const projectPath = TestProjectBuilder.buildLROP({
            name: 'test-lrop',
            ui5Version: '1.120.0'
        });
        
        await ProjectMigrator.migrate(projectPath, ...);
        
        // Verify output files exist
        expect(existsSync(join(projectPath, 'ui5.yaml'))).toBe(true);
        expect(existsSync(join(projectPath, 'package.json'))).toBe(true);
        
        // Verify content matches tools-suite snapshots
        const ui5Yaml = readFileSync(join(projectPath, 'ui5.yaml'), 'utf-8');
        expect(ui5Yaml).toMatchSnapshot();
    });
});
```

#### 3. **Test Template Rendering** (For files still using templates)

```typescript
// test/template-application.test.ts
describe('Application Templates', () => {
    test('should render flpSandbox.html with rootIntent', async () => {
        const templateData = {
            project: { semanticObject: 'Display', title: 'Test App' },
            hasRootIntent: { flpSandboxRootIntent: true },
            appIntent: 'Display-action'
        };
        
        const html = await renderTemplate('flpSandbox.html', templateData);
        
        expect(html).toContain('rootIntent: "Display-action"');
        expect(html).toContain('window["sap-ushell-config"]');
    });
});
```

#### 4. **Test File Discovery & Utils** (What Actually Exists)

```typescript
// test/file-discovery.test.ts
describe('File Discovery', () => {
    test('should find all project roots', async () => {
        const workspaceFolder = createTestWorkspace();
        
        const roots = await findAllProjectRoots([workspaceFolder]);
        
        expect(roots).toHaveLength(2);
        expect(roots[0]).toContain('webapp');
    });
});
```

## Current Implementation Status

### ✅ What's Implemented in Source

| Component | Status | Location |
|-----------|--------|----------|
| **UI5 YAML Generation** | ✅ Done | `src/adapters/ui5-config-adapter.ts` |
| **UI5Config integration** | ✅ Done | `src/config/ui5-yaml.ts` |
| **ProjectMigrator** | ✅ Done | `src/ProjectMigrator.ts` |
| **BulkProjectMigrator** | ✅ Done | `src/BulkProjectMigrator.ts` (has `migrate()` not `migrateAll()`) |
| **File discovery** | ✅ Done | `src/utils/file-discovery.ts` (`findAllProjectRoots`, `getReuseLibs`) |
| **File access** | ✅ Done | `src/utils/file-access.ts` |
| **Template rendering** | ✅ Done | `src/template/application.ts` |

### ❌ What's NOT Implemented (Tests Were Premature)

| Function | Expected In | Status |
|----------|-------------|--------|
| `detectProjectType` | `src/utils/file-discovery.ts` | ❌ Not implemented |
| `generateUI5Config` | `src/config/ui5-yaml.ts` | ❌ Not implemented (we have `generateUI5YamlContent` instead) |
| `migrateAll()` method | `BulkProjectMigrator` | ❌ Not implemented (we have `migrate()` instead) |

## Test Strategy Moving Forward

### Phase 1: Fix Current Tests (Immediate)

1. **Update imports to match actual API:**
   ```typescript
   // ❌ Wrong (doesn't exist)
   import { detectProjectType } from '../src/utils/file-discovery.js';
   
   // ✅ Correct (exists)
   import { findAllProjectRoots, getReuseLibs } from '../src/utils/file-discovery.js';
   ```

2. **Update method names:**
   ```typescript
   // ❌ Wrong
   await migrator.migrateAll();
   
   // ✅ Correct
   await migrator.migrate(projects, ui5SnapshotUrl);
   ```

3. **Comment out or delete tests for non-existent functions:**
   ```typescript
   // test/file-discovery.test.ts
   describe.skip('detectProjectType', () => {
       // TODO: Implement detectProjectType or remove this test
   });
   ```

### Phase 2: Focus on What Matters (After E2E)

1. **Adapter Tests** - Test the UI5Config wrapper
2. **Migration Flow Tests** - End-to-end with minimal fixtures
3. **Template Tests** - For HTML/JS files that still use templates
4. **Utility Tests** - File discovery, file access, helpers

### Phase 3: Snapshot Validation (Critical!)

**Golden Rule:** Tools-suite master snapshots are the benchmark.

```typescript
// Compare against tools-suite snapshots
const toolsSuiteSnapshot = readFileSync(
    '/Users/I320242/Documents/SAPDevelop/tools-suite/packages/lib/app-migrator/test/custom_snapshots/projectMigrator.ts/lrop-v2/ui5.yaml.shot'
);

expect(generatedYaml).toEqual(toolsSuiteSnapshot);
```

## Testing Anti-Patterns to Avoid

### ❌ Don't Test Implementation Details of Writers

```typescript
// ❌ Bad - Testing internal UI5Config implementation
test('should call addFioriToolsProxyMiddleware with exact params', () => {
    const spy = jest.spyOn(UI5Config.prototype, 'addFioriToolsProxyMiddleware');
    // ...
});
```

### ❌ Don't Test Non-Existent Functions

```typescript
// ❌ Bad - Function doesn't exist
test('should detect project type', () => {
    const type = detectProjectType(path); // ← Doesn't exist!
});
```

### ✅ Do Test Output and Behavior

```typescript
// ✅ Good - Test what actually gets generated
test('should generate ui5.yaml with correct structure', async () => {
    const yaml = await generateUI5YamlContent(templateData);
    const parsed = parse(yaml);
    
    expect(parsed.specVersion).toBe('4.0');
    expect(parsed.server.customMiddleware[0].name).toBe('fiori-tools-proxy');
});
```

## Key Takeaways

1. **Architecture is writer-based** - Use `@sap-ux/ui5-config` for YAML, templates for HTML/JS
2. **No duplication** - Generators and migration share the same UI5Config API
3. **Complete isolation** - Migration logic in its own package, doesn't affect generators
4. **Test what exists** - Not aspirational APIs
5. **Snapshots are gold** - Tools-suite master is the benchmark
6. **Fix tests to match reality** - Update imports, method names, skip non-existent functions

## Related Documents

- [TEMPLATE_ABANDONMENT_ANALYSIS.md](file:///Users/I320242/Documents/SAPDevelop/tools-suite/TEMPLATE_ABANDONMENT_ANALYSIS.md) - Why we can't fully abandon templates
- [WRITER_REFACTOR_SUMMARY.md](file:///Users/I320242/Documents/SAPDevelop/tools-suite/WRITER_REFACTOR_SUMMARY.md) - UI5Config migration details
- [ARCHITECTURE_ISOLATION_ANALYSIS.md](file:///Users/I320242/Documents/SAPDevelop/tools-suite/ARCHITECTURE_ISOLATION_ANALYSIS.md) - No duplication, complete isolation

## Next Steps

1. Wait for E2E Round 2 to complete
2. Fix test imports and method names
3. Focus tests on actual implementation (adapters, migration flow, templates)
4. Validate all snapshots against tools-suite master
5. Achieve 80%+ coverage on implemented code
