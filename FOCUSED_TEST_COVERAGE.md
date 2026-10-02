# Focused Test Coverage Strategy

## Current Coverage: 63.73% (Target: >80%)

## Critical Coverage Gaps

### 1. file-discovery.ts - 4.41% coverage ❗️
**Missing:** `findAllProjectRoots()`, `findAll()` - only `getReuseLibs()` tested
**Solution:** Add unit tests for these functions (no new projects needed)

### 2. Adaptation Projects - 0% coverage ❗️
**Missing:** adaptation-project.ts, adaptation-project-utils.ts
**Existing project:** `adaptation_project_wde` (already in input/)
**Solution:** Add test case for this project

### 3. Reuse Libraries - 0-14% coverage ❗️
**Missing:** reuse-library.ts, reuse-lib-utils.ts  
**Existing project:** `reuse_library_project` (already in input/)
**Solution:** Add test case for this project

### 4. Legacy WebIDE - 2.5% coverage ❗️
**Missing:** legacy.ts (34-302), legacy-helpers.ts (40-176)
**Solution:** Need a legacy WebIDE project with .che files
**Candidate from tools-suite:** `webide_fin.co.allocation.manage` or `webide_myapprovalinbox_web`

### 5. BulkProjectMigrator - 3.12% coverage ❗️
**Missing:** Bulk migration scenarios
**Solution:** Add test for multi-project migration

---

## Action Plan (Minimal Projects)

### Phase 1: Add Missing Unit Tests (No new projects)
```typescript
// file-discovery.test.ts - add these tests:
describe('findAllProjectRoots', () => {
  test('should find project roots', async () => { ... });
  test('should filter by sapux flag', async () => { ... });
});

describe('findAll', () => {
  test('should find files by name', async () => { ... });
});
```

### Phase 2: Use Existing Projects (2 test cases)
```typescript
// migration-flow-integration.test.ts

test('should migrate adaptation_project_wde', async () => {
  // Tests: adaptation-project.ts, adaptation-project-utils.ts
  const projectPath = join(TEST_INPUT, 'adaptation_project_wde');
  // ... existing pattern
});

test('should migrate reuse_library_project', async () => {
  // Tests: reuse-library.ts, reuse-lib-utils.ts
  const projectPath = join(TEST_INPUT, 'reuse_library_project');
  // ... existing pattern
});
```

### Phase 3: Add 1 Legacy WebIDE Project
**Best candidate:** `webide_v2_lrop_project` (standard WebIDE pattern)
- Copy from tools-suite, sanitize
- Exercises legacy.ts and legacy-helpers.ts

### Phase 4: Add BulkProjectMigrator Test
Use existing projects in a bulk scenario (no new input needed)

---

## Expected Coverage Improvement

| Module | Current | Target | Gap Closed By |
|--------|---------|--------|---------------|
| file-discovery.ts | 4.41% | >80% | Unit tests |
| adaptation-project.ts | 0% | >80% | adaptation_project_wde test |
| reuse-library.ts | 0% | >80% | reuse_library_project test |
| legacy.ts | 2.5% | >60% | webide_v2_lrop_project test |
| BulkProjectMigrator.ts | 3.12% | >70% | Bulk migration test |

**Total projects to add: 1 (webide_v2_lrop_project)**
**Test cases to add: 4-5**
**Expected final coverage: >75%**

---

## Immediate Next Steps

1. ✅ Add unit tests for findAllProjectRoots and findAll
2. ✅ Add test case for adaptation_project_wde (already in input/)
3. ✅ Add test case for reuse_library_project (already in input/)  
4. ⏳ Copy and sanitize webide_v2_lrop_project from tools-suite
5. ⏳ Add BulkProjectMigrator test
6. ✅ Run coverage again, verify >75%

This is MUCH more efficient than copying 34 projects!
