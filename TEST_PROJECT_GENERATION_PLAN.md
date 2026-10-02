# Test Project Generation Plan for fiori-migration-writer

## Goal
Generate sanitized test projects from tools-suite for comprehensive test coverage in open-ux-tools, ensuring the migration writer uses mem-fs fully like other writers.

---

## Current State

### tools-suite input projects: 48
- Extension projects (3): CA_FIORI_INBOXExtension, DDFMRG_DASHBExtension, HCMFAB_PERS_MANExtension
- SAP internal apps (15): fin.*, ci.*, cus.*, se.mi.*, s4h.*
- WebIDE projects (13): webide_*
- Tool suite samples (7): tool_suite_*
- Others (10): openui5-sample-app, nw.epm.*, stta.prod.man, etc.

### open-ux-tools input projects: 14 ✅
- CA_FIORI_INBOXExtension
- adaptation_project_wde
- multi_destination_ovp_mta
- openui5-sample-app
- reuse_library_project
- tool_suite_beta_alp_v2_project
- tool_suite_beta_lrop_v2_project
- tool_suite_ga_worklist_v2_project
- tool_suite_v4_lrop
- tool_suite_v4_lrop_custom_webapp
- webide_freestyle_custom_webapp_path
- webide_v2_lrop_project_no_webapp
- webide_v2_lrop_reuselib_ui5_tooling_routing_project
- webide_v2_ovp_project

### Missing from open-ux-tools: 34 projects

---

## Sanitization Strategy

### What to Remove/Replace

1. **SAP Internal URLs**
   - Remove backend URLs pointing to SAP internal systems
   - Replace with generic placeholders: `https://example.sap.com`
   - Check: neo-app.json, manifest.json, ui5.yaml

2. **Internal Package Names**
   - Replace SAP-specific namespace prefixes if internal
   - Keep standard SAP namespaces (sap.ui.*, sap.m.*)

3. **Sensitive Data**
   - Remove credentials, API keys
   - Remove internal server names, IPs
   - Remove employee information, customer data
   - Check: .env files, config files, comments

4. **Legal Compliance**
   - Ensure no SAP confidential code snippets
   - Replace proprietary business logic with generic examples
   - Keep UI5/Fiori patterns (these are public)

5. **Files to Check**
   - manifest.json (dataSources, backend URLs)
   - neo-app.json (routes, destinations)
   - package.json (dependencies with internal registries)
   - .project.json, .che.project (WebIDE metadata)
   - ui5.yaml (if exists, middleware configs)
   - *.js, *.ts (comments, hardcoded URLs)

---

## Project Selection Criteria

### Priority 1: Essential Coverage (10 projects)
These test critical migration scenarios not yet covered:

1. **fin.co.costcenter.manage** - V2 LROP with nested structure
2. **fin.ar.lineitems.display** - V2 ALP variant
3. **webide_v2_lrop_project** - Standard WebIDE LROP
4. **webide_v2_ovp_with_no_package_json** - Migration without package.json
5. **tool_suite_steampunk_lrop_v2** - ABAP Cloud scenario
6. **nw.epm.refapps.st.prod.manage** - EPM reference app pattern
7. **timesheet** - Freestyle with custom structure
8. **teched2020-DEV164** - TechEd sample structure
9. **fe-samples-cap** - CAP-based Fiori app
10. **migrate.test-BAS** - BAS-specific migration

### Priority 2: Edge Cases (8 projects)
Test unusual configurations:

11. **timesheet no bsp name** - Missing BSP application name
12. **webide_fin.co.accountingimpact.display_no_webapp** - No webapp folder
13. **CA_FIORI_INBOXExtension_as_freestyle** - Extension as freestyle
14. **webide_freestyle_custom_webapp_path** - (already have, verify)
15. **webide_myapprovalinbox_web** - Inbox pattern
16. **ci.settleman.setdoc.manages1** - Git branch name suffix
17. **s4h.cfnd.featuretoggle.lib-refs_heads_masters1** - Feature toggle pattern
18. **migrate.test-WDE** - WDE-specific migration

### Priority 3: Additional Coverage (remaining 16)
If time permits, add variety for comprehensive testing

---

## Sanitization Script

```bash
#!/bin/bash
# sanitize-test-project.sh
# Usage: ./sanitize-test-project.sh <source-project> <output-project>

SOURCE=$1
OUTPUT=$2

echo "Sanitizing $SOURCE -> $OUTPUT"

# Copy project
cp -r "$SOURCE" "$OUTPUT"
cd "$OUTPUT"

# 1. Replace SAP internal URLs
find . -type f \( -name "*.json" -o -name "*.yaml" -o -name "*.yml" \) -exec sed -i '' \
  -e 's|https://[a-z0-9.-]*\.sap\.corp|https://example.sap.com|g' \
  -e 's|https://[a-z0-9.-]*\.internal\.sap|https://example.sap.com|g' \
  -e 's|http://[a-z0-9.-]*\.sap\.corp|http://example.sap.com|g' \
  {} \;

# 2. Remove .che.project (BAS-specific, not needed for tests)
find . -name ".che.project" -delete

# 3. Sanitize manifest.json dataSources
find . -name "manifest.json" -type f -exec node -e '
  const fs = require("fs");
  const file = process.argv[1];
  try {
    const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
    if (manifest["sap.app"]?.dataSources) {
      Object.values(manifest["sap.app"].dataSources).forEach(ds => {
        if (ds.uri && /sap\.corp|internal\.sap/.test(ds.uri)) {
          ds.uri = ds.uri.replace(/https?:\/\/[^\/]+/, "https://example.sap.com");
        }
      });
    }
    fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + "\n");
  } catch (e) {
    console.error("Error processing", file, e.message);
  }
' {} \;

# 4. Remove credentials from neo-app.json
find . -name "neo-app.json" -type f -exec node -e '
  const fs = require("fs");
  const file = process.argv[1];
  try {
    const neoApp = JSON.parse(fs.readFileSync(file, "utf8"));
    if (neoApp.routes) {
      neoApp.routes.forEach(route => {
        if (route.target?.url && /sap\.corp|internal\.sap/.test(route.target.url)) {
          route.target.url = "https://example.sap.com";
        }
        delete route.authenticationType; // Remove auth config
      });
    }
    fs.writeFileSync(file, JSON.stringify(neoApp, null, 2) + "\n");
  } catch (e) {}
' {} \;

# 5. Clean comments that might contain sensitive info
find . -type f \( -name "*.js" -o -name "*.ts" \) -exec sed -i '' \
  -e '/\/\/ TODO.*@sap\.com/d' \
  -e '/\/\/ FIXME.*@sap\.com/d' \
  {} \;

echo "✓ Sanitization complete"
```

---

## mem-fs Usage Verification

The fiori-migration-writer **already uses mem-fs correctly**:

### Current Implementation ✅
```typescript
// test/migration-flow-integration.test.ts
const fs = loadProjectIntoMemFs(projectPath);
ProjectMigrator.fs = fs;
await ProjectMigrator.migrate(...);
expect(fs.dump(projectPath)).toMatchSnapshot();
```

### Pattern Matches Other Writers ✅
```typescript
// packages/ui5-application-writer/test/index.test.ts
const fs = create(createStorage());
await generate(projectDir, config, fs);
expect(fs.dump(projectDir)).toMatchSnapshot();
```

**No changes needed** - already following best practices.

---

## Test Generation Workflow

### Step 1: Prepare Branches
```bash
# Ensure we're on the right branches
cd /Users/I320242/Documents/SAPDevelop/open-ux-tools
git checkout feat/fiori-migration-writer/add-missing-exports
git pull origin feat/fiori-migration-writer/add-missing-exports

cd /Users/I320242/Documents/SAPDevelop/tools-suite
git checkout feat/app-migrator/consume-open-source-writer
```

### Step 2: Sanitize and Copy Projects (Priority 1)
```bash
cd /Users/I320242/Documents/SAPDevelop/tools-suite

# For each Priority 1 project:
./sanitize-test-project.sh \
  packages/lib/app-migrator/test/input/fin.co.costcenter.manage \
  /tmp/sanitized/fin.co.costcenter.manage

# Manual review
cd /tmp/sanitized/fin.co.costcenter.manage
grep -r "sap.corp" .
grep -r "internal.sap" .
grep -r "@sap.com" .

# Copy to open-ux-tools
cp -r /tmp/sanitized/fin.co.costcenter.manage \
  /Users/I320242/Documents/SAPDevelop/open-ux-tools/packages/fiori-migration-writer/test/input/
```

### Step 3: Generate Test Cases
```bash
cd /Users/I320242/Documents/SAPDevelop/open-ux-tools/packages/fiori-migration-writer

# Add test case to migration-flow-integration.test.ts
```

Example test case:
```typescript
test('should migrate fin.co.costcenter.manage', async () => {
    const projectPath = join(TEST_INPUT, 'fin.co.costcenter.manage');
    const fs = loadProjectIntoMemFs(projectPath);
    
    ProjectMigrator.fs = fs;
    
    try {
        const result = await ProjectMigrator.migrate(
            projectPath,
            DUMMY_BACKEND_URL,
            UI5_SNAPSHOT_URL,
            undefined,
            undefined,
            false
        );
        
        expect(result.result).toBe(true);
        expect(result.messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
        expect(fileExistsInMemFs(fs, projectPath, 'ui5.yaml')).toBe(true);
        expect(fs.dump(projectPath)).toMatchSnapshot();
    } finally {
        ProjectMigrator.fs = undefined;
    }
});
```

### Step 4: Run Tests and Update Snapshots
```bash
npm test -- migration-flow-integration.test.ts
npm test -- migration-flow-integration.test.ts -u  # Update snapshots
```

### Step 5: Verify Coverage
```bash
npm test -- --coverage
# Target: >80% coverage on all metrics
```

---

## Manual Review Checklist

For each sanitized project:

- [ ] No SAP internal URLs (*.sap.corp, *.internal.sap)
- [ ] No employee emails (@sap.com in comments)
- [ ] No credentials or API keys
- [ ] No internal server names or IPs
- [ ] manifest.json dataSources sanitized
- [ ] neo-app.json routes sanitized
- [ ] All URLs replaced with example.sap.com
- [ ] Business logic is generic (no proprietary algorithms)
- [ ] Legal review: no SAP confidential content

---

## Next Steps

1. Create sanitization script (`sanitize-test-project.sh`)
2. Start with Priority 1 projects (10)
3. Sanitize each project manually reviewed
4. Add test cases to `migration-flow-integration.test.ts`
5. Run tests and verify snapshots
6. Check coverage improvements
7. Commit to open-ux-tools branch
8. Sync to tools-suite if needed

---

## Success Criteria

- [ ] 10+ new sanitized test projects added to open-ux-tools
- [ ] All tests passing (mem-fs based, no filesystem writes)
- [ ] Test coverage >80% across all metrics
- [ ] Snapshots captured for regression testing
- [ ] No SAP internal/sensitive data in test projects
- [ ] Documentation updated (this file → committed to repo)

---

**Status:** Planning complete, ready to execute  
**Branch:** `feat/fiori-migration-writer/add-missing-exports`  
**Next:** Create sanitization script and start with Priority 1 projects
