<!-- 🔍 Please search existing issues to avoid creating duplicates. -->

### Related Feature
Feature request: Migration of projects with reuse library dependencies

### Description
The `@sap-ux/fiori-migration-writer` package fails to configure reuse libraries in the generated `ui5.yaml` file. When migrating projects that depend on custom reuse libraries (non-SAP UI5 libraries), the migration completes successfully but the migrated app cannot load in local preview because the UI5 loader cannot resolve the reuse library paths.

The migration discovers reuse libraries and stores them in `projectInfo.reuseLibs`, but the ui5.yaml generation code never reads this field to add the required `customConfiguration.shims` section.

### Steps to Reproduce
Steps to reproduce the behavior:
1. Migrate a project with reuse library dependencies (custom libraries declared in `manifest.json` dependencies)
2. Run migration via `@sap-ux/fiori-migration-writer`
3. Check the generated `ui5.yaml` - note it has no `customConfiguration` section
4. Run `npm run start` or `npm run start-mock` to preview the app
5. Open browser console - observe 404 errors for reuse library resources:
   ```
   Failed to load resource: http://localhost:PORT/resources/<library-path>/library.js
   ModuleError: failed to load '<library-path>/library.js' from ../resources/<library-path>/library.js: script load error
   ```
6. App fails to load with "Failed to load UI5 component" error

### Expected results
- Migration should detect reuse library dependencies from `manifest.json` (`sap.ui5.dependencies.libs` and `sap.ui5.dependencies.components`)
- Generated `ui5.yaml` should include `customConfiguration` with `shims` mapping library names to their local paths:
  ```yaml
  customConfiguration:
    sap.watt.common.plugin.fioriOptions:
      reuseLibs:
        com.example.lib.reuse:
          - ../../path/to/reuse-lib
        com.example.lib.common:
          - ../../path/to/common-lib
  ```
- App should load successfully in local preview with reuse libraries resolved from local workspace

### Actual results
- Migration detects reuse libraries correctly (stores in `projectInfo.reuseLibs`)
- Generated `ui5.yaml` has **no** `customConfiguration` section
- `locate-reuse-libs.js` script attempts to fetch library paths from backend endpoint `/sap/bc/ui2/app_index/ui5_app_info?id=...`
- Backend endpoint returns 404 (doesn't exist in local preview)
- UI5 loader fails to load reuse libraries
- App fails to initialize with module loading errors
- Browser console shows cascade of 404s and "script load error" messages

### Screenshots
Browser console errors from test run:
```
error -- Failed to load resource: the server responded with a status of 404 (Not Found) 
=== {"url":"http://localhost:PORT/resources/sap/example/lib/reuse/library-preload.js"...}

error -- failed to load JavaScript resource: sap/example/lib/reuse/library.js

error -- Component.create() failed - ModuleError: failed to load 
'sap/example/lib/reuse/library.js' from ../resources/sap/example/lib/reuse/library.js: 
script load error
```

Network tab shows 404s for:
- `/sap/bc/ui2/app_index/ui5_app_info?id=<reuse-library-name>`
- `/resources/<reuse-library-path>/library-preload.js`
- `/resources/<reuse-library-path>/library.js`

#### Version/Components/Environment	
**Affected Package:** `@sap-ux/fiori-migration-writer` (all versions)  
**Scope:** Applications with custom reuse library dependencies fail to load after migration

**Test Environment:**
- Node.js: 18.x+
- OS:                      
- [x] Mac OS
- [x] Windows
- [x] Other (Linux)

**Example Reuse Library Dependencies:**
- Custom business logic libraries
- Shared component libraries  
- Organization-specific UI5 libraries

---

<!-- 🛑 The reporter of this issue can skip filling this section. -->
<!-- 🗒️ When the issue is fixed, developer will document the Root Cause Analysis of the bug to improve process or code in future. -->
## Root Cause Analysis 

### Problem
The UI5 YAML generation in `@sap-ux/fiori-migration-writer` was refactored to use `@sap-ux/ui5-config` builder instead of EJS templates (PR #39636). During this refactoring, the logic to configure reuse library shims was **not ported from the old template-based approach**.

**Data flow breakdown:**
1. ✅ `src/project/regular-project.ts` discovers reuse libs from manifest and stores as comma-separated string in `projectInfo.reuseLibs`
2. ✅ `projectInfo` is passed to `templateData.project.reuseLibs`
3. ❌ `src/adapters/ui5-config-adapter.ts` (`generateUI5YamlContent()`) **never reads** `templateData.project.reuseLibs`
4. ❌ No call to `config.addCustomConfiguration()` with shims
5. ❌ Generated yaml missing `customConfiguration` section
6. ❌ Runtime `locate-reuse-libs.js` cannot resolve libraries → 404 cascade → app load failure

### Fix
**In `packages/fiori-migration-writer/src/adapters/`:**

1. **ui5-config-helpers.ts**: Add function `buildReuseLibsShims(templateData, workspaceFolders)` that:
   - Parses `templateData.project.reuseLibs` (comma-separated string)
   - Discovers reuse lib paths via `getReuseLibs()` from workspace folders
   - Builds shims object mapping lib names → relative paths
   - Returns `{ 'sap.watt.common.plugin.fioriOptions': { reuseLibs: {...} } }`

2. **ui5-config-adapter.ts**: In `generateUI5YamlContent()` after preview middleware:
   ```typescript
   // Add reuse library shims if present
   const shimsConfig = buildReuseLibsShims(templateData, workspaceFolders);
   if (shimsConfig) {
       config.addCustomConfiguration('sap.watt.common.plugin.fioriOptions', shimsConfig);
   }
   ```

3. **Update function signatures**: `generateUI5YamlContent()` needs `workspaceFolders` parameter to discover reuse lib paths

4. **Snapshots**: Update integration test snapshots to include `customConfiguration` for projects with reuse libs

### Why was it missed
1. **Incomplete refactoring scope**: The EJS → ui5-config migration (PR #39636) focused on replacing the template engine but did not audit whether ALL template features were ported. The old EJS templates likely had reuse lib logic that was overlooked.

2. **No failing unit/integration tests**: The migration has unit tests for basic YAML generation, but no test cases specifically validate reuse library shims configuration. Tests pass because they don't assert on `customConfiguration` presence.

3. **Mass e2e tests not blocking CI**: The mass migration e2e suite runs but failures don't block PRs. These tests would have caught the regression immediately if they were mandatory gates.

4. **Lack of test coverage for reuse lib edge case**: While `test/integration/reuse-service-backend-coverage.test.ts` exists, it likely doesn't validate ui5.yaml shims output — just that migration completes.

5. **Data discovered but unused**: Code discovers reuse libs (`projectInfo.reuseLibs`) but nothing validates this data is consumed downstream. A contract test between discovery and yaml generation would have caught this.

### How can we avoid this
**Immediate (for this bug):**
1. Add integration test case: `coverage_reuse_libs_multiple` that asserts ui5.yaml contains `customConfiguration.sap.watt.common.plugin.fioriOptions.reuseLibs` with expected library mappings
2. Add unit test in `ui5-config-adapter.test.ts` covering `buildReuseLibsShims()` logic
3. Make mass-e2e test suite **required** for fiori-migration-writer PRs (or at minimum, run subset covering reuse libs)

**Process improvements:**
1. **Refactoring checklist**: When replacing a major component (templates → builders), create checklist of ALL features the old system supported and verify each is covered in new system
2. **Feature parity tests**: Before deprecating old code path, run both old and new side-by-side on test corpus and diff outputs
3. **Integration test coverage audit**: For migration packages, ensure every field in `projectInfo` has at least one test asserting it affects output correctly
4. **Snapshot diffs in PRs**: PRs that change yaml generation should show snapshot diffs in review — absence of diffs for reuse lib projects would have been suspicious
5. **CI gates**: Mass-e2e failures should block merge for packages they test. If too noisy, isolate critical subset (e.g., "happy path + one edge case per category")

**Technical debt:**
- The `projectInfo.reuseLibs` string format (comma-separated) is fragile. Consider structured `reuseLibs: Array<{name: string, path: string}>` to make consumption easier and catch data loss
- Adapter layer should have explicit "feature support matrix" doc listing what template data it reads (prevents silent data drops during refactors)
