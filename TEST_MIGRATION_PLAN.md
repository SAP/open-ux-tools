# Test Migration Plan: fiori-migration-writer Coverage Gap

**Date:** 2026-09-28  
**Issue:** Massive test coverage gap between tools-suite (89 tests) and open-ux-tools (3 tests)  
**Risk:** Breaking changes in open-ux-tools won't be caught until tools-suite consumes them (potentially 1 week later)

---

## Current State

### tools-suite/app-migrator
- **Test files:** 89
- **Lines of test code:** ~5,000+ lines
- **Key coverage:**
  - 40+ real project migrations (projectMigrator.test.ts)
  - File discovery and validation
  - Config generation (ui5.yaml, ui5-local.yaml, ui5-mock.yaml)
  - Manifest handling
  - Backend configuration
  - Bulk migration
  - Type definitions
  - Utility functions

### open-ux-tools/fiori-migration-writer
- **Test files:** 3
- **Lines of test code:** ~200 lines
- **Current coverage:**
  - Basic template generation
  - Security validation
  - Manifest placeholder handling (recent addition)

**Coverage Gap:** ~97% of test code is missing in open-ux-tools

---

## Risk Analysis

### High Risk (Without Comprehensive Tests)
1. **Week-long feedback loop:** Changes to fiori-migration-writer break tools-suite a week later
2. **Silent regressions:** No CI failures in open-ux-tools, failures only appear in tools-suite
3. **External consumer confidence:** Insufficient tests for public package
4. **Breaking changes undetected:** API changes break tools-suite without warning

### Impact
- **Development velocity:** Slower iteration cycles
- **Quality:** More bugs reach tools-suite
- **Maintainability:** Hard to refactor without comprehensive test coverage

---

## Test Migration Strategy

### Phase 1: Core Migration Logic (Priority 1, Week 1)
**Goal:** Migrate critical tests that verify core migration functionality

#### 1.1 Project Migration Tests (from projectMigrator.test.ts)
**Current coverage in tools-suite:** 1069 lines, 40+ projects

**What to migrate:**
```typescript
// Test structure:
test/project-migration/*.test.ts
├── basic-fiori-elements.test.ts        // LROP, OVP, ALP projects
├── fiori-freestyle.test.ts              // Freestyle projects
├── extension-projects.test.ts           // Extension projects
├── reuse-libraries.test.ts              // Reuse library projects
└── edge-cases.test.ts                   // Custom webapp paths, no package.json

// Test input fixtures:
test/fixtures/projects/
├── webide_v2_lrop_project/
├── webide_v2_ovp_project/
├── tool_suite_beta_lrop_v2_project/
├── CA_FIORI_INBOXExtension/
└── webide_v2_lrop_reuselib_ui5_tooling_routing_project/
```

**Approach:**
- Copy 10-15 representative project fixtures from tools-suite
- Migrate snapshot-based tests
- Verify end-to-end migration output (ui5.yaml, ui5-local.yaml, ui5-mock.yaml, Component.js)

**Test categories:**
- ✅ V2 Fiori Elements (LROP, OVP, ALP, Worklist)
- ✅ V4 Fiori Elements
- ✅ Freestyle projects
- ✅ Extension projects (Component.js generation)
- ✅ Reuse libraries
- ✅ Projects with custom webapp paths
- ✅ Projects without package.json
- ✅ Projects with neo-app.json destinations

**Estimated effort:** 3-4 days

---

#### 1.2 Config Generation Tests (from ui5-config-adapter.test.ts + ui5-config-helpers.test.ts)
**Current coverage in tools-suite:** 553 lines

**What to migrate:**
```typescript
test/config-generation/*.test.ts
├── ui5-yaml-generation.test.ts
├── ui5-local-yaml-generation.test.ts
├── ui5-mock-yaml-generation.test.ts
├── backend-configuration.test.ts
└── mockserver-middleware.test.ts
```

**Test scenarios:**
- ✅ specVersion 4.0 added correctly
- ✅ Backend configuration with proxy paths
- ✅ Backend cleanup (empty URLs removed)
- ✅ UI5 version in proxy (setUI5Version flag)
- ✅ Framework section in ui5-local.yaml
- ✅ Mockserver middleware added when generateMockData=true
- ✅ Middleware order (proxy → appreload → preview)
- ✅ Neo-app destinations converted to backends
- ✅ WebappPath applied correctly
- ✅ Theme library handling (no duplicates)

**Estimated effort:** 2 days

---

#### 1.3 Manifest Handling Tests (from types.test.ts, check-migrated-files-helpers.test.ts)
**Current coverage in tools-suite:** 613 lines

**What to migrate:**
```typescript
test/manifest/*.test.ts
├── manifest-update.test.ts
├── manifest-ui5-version.test.ts
├── manifest-placeholder.test.ts  // Already exists
├── manifest-datasource.test.ts
└── manifest-source-template.test.ts
```

**Test scenarios:**
- ✅ Maven placeholder preservation (${sap.ui5.dist.version})
- ✅ Snapshot version removal (1.102.2-SNAPSHOT → 1.102.2)
- ✅ minUI5Version array handling
- ✅ DataSource URI updates (local service paths)
- ✅ Source template tracking (toolsId)
- ✅ Application ID placeholder replacement
- ✅ sap.ui5 section validation

**Estimated effort:** 1.5 days

---

### Phase 2: File Discovery & Validation (Priority 2, Week 2)

#### 2.1 File Discovery Tests (from file-discovery.test.ts)
**Current coverage in tools-suite:** 405 lines

**What to migrate:**
```typescript
test/file-discovery/*.test.ts
├── webapp-discovery.test.ts
├── neo-app-detection.test.ts
├── project-type-detection.test.ts
└── migration-eligibility.test.ts
```

**Test scenarios:**
- ✅ Webapp folder detection
- ✅ Custom webapp path handling
- ✅ Neo-app.json parsing
- ✅ Package.json validation
- ✅ Manifest.json validation
- ✅ Project type detection (FE, Freestyle, Extension, Reuse Lib)
- ✅ Migration eligibility checks

**Estimated effort:** 2 days

---

#### 2.2 File Validation Tests (from check-migrated-files-helpers.test.ts)
**Current coverage in tools-suite:** 311 lines

**What to migrate:**
```typescript
test/validation/*.test.ts
├── migrated-files-validation.test.ts
├── yaml-structure-validation.test.ts
└── component-generation-validation.test.ts
```

**Test scenarios:**
- ✅ All expected files generated
- ✅ No unexpected files created
- ✅ Component.js generation for V2 FE with namespace
- ✅ YAML structure validation
- ✅ Manifest changes validation
- ✅ HTML file preservation (no changes)

**Estimated effort:** 1.5 days

---

### Phase 3: Utility & Helper Tests (Priority 3, Week 3)

#### 3.1 Common Utilities (from common.test.ts, utils.test.ts)
**Current coverage in tools-suite:** 585 lines

**What to migrate:**
```typescript
test/utils/*.test.ts
├── project-roots.test.ts
├── url-helpers.test.ts
├── file-system-helpers.test.ts
└── string-helpers.test.ts
```

**Test scenarios:**
- ✅ Project root detection
- ✅ Workspace folder handling
- ✅ URL parsing and validation
- ✅ File system utilities
- ✅ String escaping and sanitization
- ✅ POM-based project detection

**Estimated effort:** 2 days

---

#### 3.2 Reuse Library Tests (from reuse-lib-utils.test.ts)
**Current coverage in tools-suite:** 129 lines

**What to migrate:**
```typescript
test/reuse-libraries/*.test.ts
├── reuse-lib-detection.test.ts
├── reuse-lib-routing.test.ts
└── reuse-lib-config.test.ts
```

**Test scenarios:**
- ✅ Reuse library detection
- ✅ UI5 tooling routing for reuse libs
- ✅ Reuse library dependency handling
- ✅ Nested reuse library projects

**Estimated effort:** 1 day

---

### Phase 4: Integration Tests (Priority 4, Week 4)

#### 4.1 End-to-End Migration Tests
**New test suite for comprehensive validation**

```typescript
test/integration/*.test.ts
├── full-migration-flow.test.ts
├── bulk-migration.test.ts
└── error-handling.test.ts
```

**Test scenarios:**
- ✅ Complete migration flow (input → output validation)
- ✅ Bulk migration of multiple projects
- ✅ Error handling and recovery
- ✅ Warning message generation
- ✅ Migration state persistence

**Estimated effort:** 2 days

---

#### 4.2 Regression Test Suite
**Use real project fixtures from tools-suite**

```typescript
test/regression/*.test.ts
└── snapshot-regression.test.ts  // 40+ project snapshots
```

**Approach:**
- Copy curated project fixtures from tools-suite
- Create snapshot tests for each
- Verify output matches expected format
- Catch regressions automatically

**Estimated effort:** 1 day

---

## Test Fixtures Strategy

### Shared Fixtures Between Repos
**Problem:** Don't want to duplicate large project fixtures

**Solution: Lightweight fixtures in open-ux-tools + Link to tools-suite for comprehensive testing**

```
open-ux-tools/packages/fiori-migration-writer/test/fixtures/
├── minimal/                    // Minimal projects for unit tests
│   ├── lrop-basic/
│   ├── ovp-basic/
│   └── freestyle-basic/
└── representative/             // 10-15 representative projects
    ├── webide_v2_lrop_project/
    ├── webide_v2_ovp_with_no_package_json/
    ├── CA_FIORI_INBOXExtension/
    └── ...
```

**Fixture selection criteria:**
1. Cover all project types (FE, Freestyle, Extension, Reuse Lib)
2. Cover edge cases (no package.json, custom webapp, neo-app)
3. Small enough for open-source repo (<50MB total)
4. Representative of real-world projects

---

## Success Metrics

### Coverage Targets
- **Phase 1 (Week 1):** 60% test coverage (core migration logic)
- **Phase 2 (Week 2):** 75% test coverage (+ file discovery/validation)
- **Phase 3 (Week 3):** 85% test coverage (+ utilities)
- **Phase 4 (Week 4):** 90%+ test coverage (+ integration tests)

### Quality Gates
- ✅ All migrated tests pass in open-ux-tools CI
- ✅ tools-suite still passes when consuming latest fiori-migration-writer
- ✅ Code coverage >85% for core migration modules
- ✅ Snapshot tests for 15+ representative projects

---

## Implementation Plan

### Week 1: Foundation
**Days 1-2:** Set up test infrastructure
- Create test directory structure
- Add minimal project fixtures
- Set up Jest configuration for ESM
- Create test helpers and utilities

**Days 3-5:** Migrate core migration tests
- Project migration tests (10-15 projects)
- Config generation tests
- Manifest handling tests

### Week 2: Validation & Discovery
**Days 1-2:** File discovery tests
- Webapp detection
- Project type detection
- Migration eligibility

**Days 3-4:** File validation tests
- Output validation
- Component.js generation
- YAML structure validation

**Day 5:** Buffer for debugging and refinement

### Week 3: Utilities & Helpers
**Days 1-2:** Common utilities
- Project roots
- File system helpers
- String utilities

**Days 3-4:** Reuse library tests
- Detection and routing
- Configuration handling

**Day 5:** Code review and cleanup

### Week 4: Integration & Polish
**Days 1-2:** Integration tests
- End-to-end flows
- Bulk migration
- Error handling

**Days 3-4:** Regression test suite
- Snapshot tests for all fixtures
- Cross-verify with tools-suite

**Day 5:** Documentation and handoff

---

## Risk Mitigation

### Risk 1: Test Fixtures Too Large
**Mitigation:** 
- Use minimal fixtures for unit tests
- Use 10-15 representative projects for integration tests
- Document how to run comprehensive tests against tools-suite fixtures

### Risk 2: Test Maintenance Burden
**Mitigation:**
- Shared snapshot format between repos
- Automated test generation where possible
- Clear documentation on test purpose and coverage

### Risk 3: Breaking Changes During Migration
**Mitigation:**
- Migrate tests incrementally
- Keep tools-suite tests as source of truth during transition
- Run both test suites in parallel until migration complete

### Risk 4: ESM Test Complexity
**Mitigation:**
- Use existing ESM patterns from other open-ux-tools packages
- Document ESM testing gotchas
- Create test utilities to simplify ESM mocking

---

## Long-term Maintenance

### Continuous Synchronization
- tools-suite tests remain comprehensive (262 tests)
- open-ux-tools tests cover core functionality (80-100 tests)
- When adding features, add tests to BOTH repos

### Test Coverage Monitoring
- Set up code coverage reporting in CI
- Fail PR if coverage drops below 85%
- Regular review of test gaps

### Documentation
- README in test/ directory explaining test structure
- TESTING.md with guidelines for contributors
- Examples of adding new tests

---

## Alternative: Shared Test Suite Package

### Option B: @sap-ux/fiori-migration-writer-tests (Internal Package)
**Pros:**
- Single source of truth for tests
- No duplication
- Both repos can consume

**Cons:**
- More complex setup
- Requires separate package management
- Harder for external contributors

**Recommendation:** Start with Option A (migrate tests), consider Option B if duplication becomes a maintenance burden

---

## Next Steps

1. **Get approval** on this plan from team/architect
2. **Week 1:** Start with Phase 1 (core migration tests)
3. **Monitor** test execution time and fixture size
4. **Adjust** plan based on findings
5. **Document** test coverage progress weekly

---

## Open Questions

1. Should we sanitize real project names in fixtures for open-source?
2. What's the maximum acceptable fixture size for open-ux-tools?
3. Should we use submodule or git-lfs for large fixtures?
4. Should integration tests run against tools-suite fixtures via CI?
5. What's the policy on test snapshots in open-source?

---

## Conclusion

This plan addresses the critical gap in test coverage for fiori-migration-writer. By migrating 80-100 key tests over 4 weeks, we'll:
- ✅ Catch breaking changes in open-ux-tools CI (not a week later)
- ✅ Build confidence for external consumers
- ✅ Enable faster iteration and refactoring
- ✅ Maintain quality parity with tools-suite

**Estimated Total Effort:** 15-20 days (3-4 weeks)  
**Priority:** High (blocks external adoption and safe refactoring)  
**Owner:** TBD (needs architect/team lead approval)
