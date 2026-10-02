# Missing Test Coverage Analysis - Fiori Migration Writer

## Current Coverage: 62.14% (Target: 80%)

## Uncovered Code Branches by Project Type

### 1. **Reuse Library Projects** - 0% Coverage
**File:** `src/project/reuse-library.ts` (0% coverage)

**Missing Test Projects:**
- ✅ Available in tools-suite: `s4h.cfnd.featuretoggle.lib-refs_heads_masters1`
- Has `.library` file and `library.js`
- Covers library migration path

**Impact:** ~2-3% coverage gain

**Code Branches Uncovered:**
- `processReuseLibrary()` function
- Library module name detection
- Library-specific migration logic

**Recommendation:** Copy `s4h.cfnd.featuretoggle.lib-refs_heads_masters1` from tools-suite to open-ux-tools test/input/

---

### 2. **Adaptation Projects** - 0% Coverage
**File:** `src/project/adaptation-project.ts` (0% coverage)

**Missing Test Projects:**
Available in tools-suite:
- `fin.ar.bankstatements.manage` (has manifest.appdescr_variant)
- `fin.ar.lineitems.display` (has manifest.appdescr_variant)
- `fin.cash.brm.bankaccount.manage` (has manifest.appdescr_variant)
- `migrate.test-BAS` (has manifest.appdescr_variant)
- `migrate.test-WDE` (has manifest.appdescr_variant)
- `se.mi.plm.attachmentservice` (has manifest.appdescr_variant)
- `webide_myapprovalinbox_web` (has manifest.appdescr_variant)

**Impact:** ~5-8% coverage gain

**Code Branches Uncovered:**
- `processAdaptationProject()` function
- Adaptation project detection
- UI adaptation configuration
- Layer handling
- Adaptation-specific backend setup

**Recommendation:** Add 1-2 adaptation projects (e.g., `migrate.test-WDE` or `fin.ar.bankstatements.manage`)

---

### 3. **Legacy WebIDE Projects** - <3% Coverage
**Files:** 
- `src/migration-process/legacy.ts` (2.52% coverage)
- `src/migration-process/legacy-helpers.ts` (0% coverage)

**Current Projects:** We have some WebIDE projects but they're not triggering legacy code paths

**Possible Reasons:**
1. Projects may have been pre-migrated or modernized
2. Legacy detection logic may not recognize them as legacy
3. Projects may be missing key legacy markers (no neo-app.json, old .project.json format, etc.)

**Missing Scenarios:**
- Projects with old WebIDE `.project.json` format
- Projects without `ui5.yaml` (pure WebIDE)
- Projects with legacy BSP structure
- Projects with old SAP Web IDE builder configuration

**Impact:** ~10-12% coverage gain

**Code Branches Uncovered:**
- Legacy project structure detection
- Old WebIDE metadata parsing
- BSP application handling
- Legacy build configuration migration
- Old-style Component.js transformation

**Recommendation:** 
1. Check if current projects are actually "legacy enough"
2. Look for projects in tools-suite that trigger legacy helpers
3. May need truly ancient WebIDE projects (pre-2018)

---

### 4. **File System Operations** - <3% Coverage
**Files:**
- `src/files/project-files.ts` (0% coverage)
- `src/files/webapp.ts` (5.4% coverage)
- `src/files/file-system.ts` (0% coverage)

**Issue:** These are heavily used by integration tests but not well covered

**Possible Reasons:**
1. Tests mock file operations instead of testing them directly
2. Error handling paths not tested
3. Edge cases (permission errors, missing directories, etc.) not covered

**Impact:** ~8-10% coverage gain

**Code Branches Uncovered:**
- File copying with permissions
- Directory structure validation
- File system error handling
- Path normalization edge cases

**Recommendation:** 
1. Add unit tests for file operations with mocked fs
2. Test error scenarios (read-only files, missing directories)
3. Test edge cases (symlinks, special characters in paths)

---

### 5. **Utility Functions** - ~45% Coverage
**Files with gaps:**
- `src/utils/file-discovery.ts` (6.66% coverage)
- `src/utils/Project.ts` (45.94% coverage)
- `src/utils/migration-utils.ts` (59.52% coverage)
- `src/utils/checkForMigration.ts` (12.5% coverage)
- `src/utils/service-detection.ts` (23.07% coverage)
- `src/utils/project-readers/reuse-lib-utils.ts` (15% coverage)

**Impact:** ~5-7% coverage gain

**Code Branches Uncovered:**
- Reuse library detection and parsing
- Project structure discovery edge cases
- Service detection from various sources
- Migration eligibility checks

**Recommendation:** Add targeted unit tests for these utilities

---

## Summary: Missing Project Types

### Must Add (High Priority)
1. **Reuse Library Project** - `s4h.cfnd.featuretoggle.lib-refs_heads_masters1`
   - Covers: library migration, module name detection
   - Gain: ~2-3%

2. **Adaptation Project** - `migrate.test-WDE` or `fin.ar.bankstatements.manage`
   - Covers: adaptation project migration, layer handling
   - Gain: ~5-8%

3. **True Legacy WebIDE Project** - Need to identify
   - Covers: legacy transformation, old WebIDE format
   - Gain: ~10-12%

### Should Add (Medium Priority)
4. **Edge Case Projects:**
   - Project with no package.json (webide_v2_ovp_with_no_package_json exists in tools-suite)
   - Project with custom build configuration
   - Project with reuse-libs referenced
   - Gain: ~3-5%

### Nice to Have (Lower Priority)
5. **Unit Tests for File Operations**
   - Direct tests of file system utilities
   - Error scenario coverage
   - Gain: ~5-8%

---

## Detailed Project Type Matrix

| Project Type | Current Tests | Tools-Suite Available | Needed | Coverage Impact |
|--------------|---------------|----------------------|--------|-----------------|
| **LROP v2** | ✅ 1 | Many | None | - |
| **LROP v4** | ✅ 2 | Many | None | - |
| **OVP v2** | ✅ 2 | Several | None | - |
| **ALP v2** | ✅ 1 | Several | None | - |
| **Worklist** | ✅ 1 | Several | None | - |
| **Freestyle** | ✅ 1 | Several | None | - |
| **Extension** | ✅ 1 | Several | None | - |
| **OpenUI5** | ✅ 1 | 1 | None | - |
| **Reuse Library** | ❌ 0 | ✅ 1 | **1 project** | +2-3% |
| **Adaptation** | ❌ 0 | ✅ 7 | **1-2 projects** | +5-8% |
| **Legacy WebIDE** | ⚠️ Partial | Many | **1 true legacy** | +10-12% |
| **MTA** | ✅ 1 | Few | None | - |
| **No package.json** | ⚠️ Maybe | ✅ 1 | Optional | +1-2% |
| **Steampunk** | ❌ 0 | ✅ 1 | Optional | +1-2% |

---

## Action Plan to Reach 80% Coverage

### Phase 1: Add Missing Project Types (6-8 hours)
**Target: +15-20% coverage → ~77-82%**

1. **Add Reuse Library Project** (2 hours)
   ```bash
   # From tools-suite
   cp -r test/input/s4h.cfnd.featuretoggle.lib-refs_heads_masters1 \
         /path/to/open-ux-tools/packages/fiori-migration-writer/test/input/
   
   # Sanitize internal URLs if any
   # Add test case to migration-flow-integration.test.ts
   ```

2. **Add Adaptation Project** (2 hours)
   ```bash
   # Pick one that's small and clean
   cp -r test/input/migrate.test-WDE \
         /path/to/open-ux-tools/packages/fiori-migration-writer/test/input/
   
   # Or use fin.ar.bankstatements.manage
   # Add test case to migration-flow-integration.test.ts
   ```

3. **Identify and Add True Legacy Project** (2-4 hours)
   - Research which tools-suite projects actually trigger legacy code paths
   - May need to create synthetic legacy project if none exist
   - Add test case to migration-flow-integration.test.ts

### Phase 2: Unit Tests for Utilities (4-6 hours)
**Target: +5-8% coverage → ~83-90%**

1. **File Discovery Tests**
   - Test `findAllProjectRoots()` with various directory structures
   - Test `getReuseLibs()` with different reuse-lib setups
   - Test edge cases: symlinks, nested projects, circular refs

2. **File Operations Tests**
   - Test file copying with permissions
   - Test error handling (read-only, missing dirs)
   - Test path normalization

3. **Service Detection Tests**
   - Test service detection from manifest
   - Test service detection from neo-app
   - Test fallback scenarios

### Phase 3: Cleanup and Validation (2 hours)
**Target: Maintain 80%+**

1. Run full test suite
2. Sync to tools-suite and validate
3. Compare snapshots
4. Document coverage gaps that are acceptable

---

## Specific Next Steps

### Immediate (Today)
1. ✅ Copy `s4h.cfnd.featuretoggle.lib-refs_heads_masters1` to test/input/
2. ✅ Add integration test for library project
3. ✅ Run tests and verify coverage increase

### This Week
1. ✅ Copy adaptation project (`migrate.test-WDE`) to test/input/
2. ✅ Add integration test for adaptation project
3. ⚠️ Identify true legacy project that triggers legacy code
4. ⚠️ Add unit tests for file-discovery.ts

### Before PR
1. Achieve 80%+ coverage
2. Validate all snapshots against tools-suite
3. Document any uncovered code and why it's acceptable
4. Sync to tools-suite and run full test suite there

---

## Expected Final Coverage Distribution

With all additions:

| Component | Current | Target | How |
|-----------|---------|--------|-----|
| src/project/reuse-library.ts | 0% | 85%+ | Library project test |
| src/project/adaptation-project.ts | 0% | 80%+ | Adaptation project test |
| src/migration-process/legacy.ts | 2.52% | 60%+ | Legacy project test |
| src/migration-process/legacy-helpers.ts | 0% | 50%+ | Legacy project test |
| src/files/project-files.ts | 0% | 60%+ | Unit tests |
| src/files/webapp.ts | 5.4% | 70%+ | Unit tests + projects |
| src/utils/file-discovery.ts | 6.66% | 70%+ | Unit tests |
| **Overall** | 62.14% | **80%+** | All of above |

---

## Why Some Code May Remain Uncovered

1. **Error handling for impossible scenarios** (disk full, permission denied in CI)
2. **Deprecated code paths** (support for ancient UI5 versions <1.38)
3. **VS Code integration code** (requires VS Code environment)
4. **Optional features** (telemetry, analytics)

Target: 80% functional coverage, some defensive code may stay at 0%.
