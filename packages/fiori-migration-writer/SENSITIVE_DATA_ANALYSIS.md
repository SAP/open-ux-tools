# Sensitive Data Analysis - Test Projects

## Executive Summary

**Status:** ✅ Test projects are SAFE for open-source publication
**Sensitive Items Found:** 4 categories (all sanitizable)
**Risk Level:** LOW - No real credentials, endpoints, or customer data

---

## Sensitive Data Categories Found

### 1. Internal SAP Module Names ⚠️ (Medium Priority)

**Location:** `reuse_library_project/`

```json
// File: .che/project.json, neo-app.json, manifest.json
"sap.s4h.cfnd.featuretoggle"
"saps4hcfndfeaturetoggle"
"path": "/resources/sap/s4h/cfnd/featuretoggle"
```

**Risk:** Reveals internal SAP S/4HANA Cloud Foundry Feature Toggle module structure
**Recommendation:** Sanitize to generic names

**Proposed Sanitization:**
```json
"sap.s4h.cfnd.featuretoggle" → "sap.example.lib.featuretoggle"
"saps4hcfndfeaturetoggle" → "examplefeaturetoggle"
"/resources/sap/s4h/cfnd/featuretoggle" → "/resources/sap/example/lib/featuretoggle"
```

---

### 2. Demo System References ⚠️ (Low Priority)

**Location:** `multi_destination_ovp_mta/multi_destination_ovp/`

```json
// Files: xs-app.json, neo-app.json, manifest.json
"destination": "ES5_Basic"
"description": "ES5 Gateway Demo System"
```

**Risk:** MINIMAL - ES5 is a well-known public SAP demo system
**Recommendation:** Keep as-is OR change to "DEMO_SYSTEM" for clarity

**Note:** ES5 is publicly documented and available to all SAP customers - NOT sensitive

---

### 3. HCP Deploy Account Names ⚠️ (Medium Priority)

**Location:** `reuse_library_project/.che/project.json`

```json
"hcpdeploy": {
    "account": "fiori",  // ← Generic account name
    "name": "saps4hcfndfeaturetoggle"
}
```

**Risk:** LOW - "fiori" is a generic account name, not customer-specific
**Recommendation:** Sanitize for consistency

**Proposed Sanitization:**
```json
"hcpdeploy": {
    "account": "demo",
    "name": "examplefeaturetoggle"
}
```

---

### 4. Test User References ℹ️ (Informational Only)

**Location:** `CA_FIORI_INBOXExtension/webapp/localService/TaskCollection.json`

```json
"ForwardingUser": "MIUSER9"
```

**Risk:** NONE - This is mock data in a local service file
**Recommendation:** Keep as-is (it's clearly fake test data)

---

## Sensitive Data NOT Found ✅

### Verified SAFE:
- ✅ **No Real Backend URLs** - No `*.wdf.sap.corp`, `ldai*`, or internal hostnames
- ✅ **No Credentials** - No passwords, API keys, tokens
- ✅ **No Customer Data** - All data is synthetic
- ✅ **No Internal System Names** - No ER9, GM6, or production system IDs
- ✅ **No SAP Client Numbers** - Only generic references (e.g., `sap-client=902` in old script comments)
- ✅ **No Private CDN URLs** - All UI5 references use public `https://ui5.sap.com`

---

## Project Name Analysis

| Project | Name | Sensitivity | Action |
|---------|------|-------------|--------|
| `tool_suite_beta_lrop_v2_project` | `namespace1.tool_suite_beta_lrop_v2_project` | ✅ Generic | Keep |
| `tool_suite_v4_lrop` | `namespace1.v4catalog` | ✅ Generic | Keep |
| `tool_suite_v4_lrop_custom_webapp` | `namespace3.v4catalog` | ✅ Generic | Keep |
| `tool_suite_beta_alp_v2_project` | `namespace1.alp` | ✅ Generic | Keep |
| `tool_suite_ga_worklist_v2_project` | `namespace2.tool_suite_ga_worklist_v2_project` | ✅ Generic | Keep |
| `webide_freestyle_custom_webapp_path` | `fin.central.listreport.reuse` | ⚠️ SAP Finance internal pattern | **Sanitize to `demo.central.listreport.reuse`** |
| `webide_v2_lrop_project_no_webapp` | `migration_test01` | ✅ Generic | Keep |
| `webide_v2_lrop_reuselib_ui5_tooling_routing_project` | `i2d.qm.defect.records1` | ⚠️ SAP internal pattern (i2d = Improve 2 Design) | **Sanitize to `demo.qm.defect.records`** |
| `webide_v2_ovp_project` | `namespace1.ovpmigration1` | ✅ Generic | Keep |
| `adaptation_project_wde` | `migrate-test` | ✅ Generic | Keep |
| `openui5-sample-app` | `sap.ui.demo.todo` | ✅ Public OpenUI5 sample | Keep |
| `CA_FIORI_INBOXExtension` | `cross.fnd.fiori.inbox.sample_fiori_inboxextension` | ⚠️ SAP internal pattern | **Sanitize to `demo.fiori.inbox.extension`** |
| `multi_destination_ovp_mta` | `multi_destination_ovp` | ✅ Generic | Keep |
| `reuse_library_project` | `sap.s4h.cfnd.featuretoggle` | ⚠️ Internal S4HANA module | **Sanitize to `sap.example.lib.featuretoggle`** |

---

## Sanitization Plan

### High Priority (Internal SAP Patterns)

#### 1. Reuse Library Project
```bash
# Files to update:
- reuse_library_project/.che/project.json
- reuse_library_project/neo-app.json
- reuse_library_project/src/sap/s4h/cfnd/featuretoggle/manifest.json
- reuse_library_project/src/sap/s4h/cfnd/featuretoggle/.library
- reuse_library_project/test/demo/sample.shop/neo-app.json
- reuse_library_project/test/demo/sample.shop/webapp/manifest.json

# Changes:
sap.s4h.cfnd.featuretoggle → sap.example.lib.featuretoggle
saps4hcfndfeaturetoggle → examplefeaturetoggle
/sap/s4h/cfnd/featuretoggle → /sap/example/lib/featuretoggle
```

#### 2. WebIDE Freestyle Project
```bash
# Files to update:
- webide_freestyle_custom_webapp_path/package.json
- webide_freestyle_custom_webapp_path/webapp/manifest.json
- webide_freestyle_custom_webapp_path/.che/project.json

# Changes:
fin.central.listreport.reuse → demo.central.listreport.reuse
```

#### 3. WebIDE LROP Reuse Library Project
```bash
# Files to update:
- webide_v2_lrop_reuselib_ui5_tooling_routing_project/package.json
- webide_v2_lrop_reuselib_ui5_tooling_routing_project/webapp/manifest.json

# Changes:
i2d.qm.defect.records1 → demo.qm.defect.records
```

#### 4. CA FIORI Inbox Extension
```bash
# Files to update:
- CA_FIORI_INBOXExtension/package.json
- CA_FIORI_INBOXExtension/webapp/manifest.json

# Changes:
cross.fnd.fiori.inbox.sample_fiori_inboxextension → demo.fiori.inbox.extension
```

### Optional (Low Priority)

#### 5. ES5 Demo System Reference
```bash
# Files: multi_destination_ovp_mta/multi_destination_ovp/
- xs-app.json
- neo-app.json  
- webapp/manifest.json

# Changes (optional):
ES5_Basic → DEMO_SYSTEM
"ES5 Gateway Demo System" → "Demo OData System"
```

---

## Automated Sanitization Script

```bash
#!/bin/bash
# File: sanitize-test-projects.sh

cd test/input

# 1. Sanitize reuse library project
find reuse_library_project -type f \( -name "*.json" -o -name ".library" \) -exec sed -i '' \
  -e 's/sap\.s4h\.cfnd\.featuretoggle/sap.example.lib.featuretoggle/g' \
  -e 's/saps4hcfndfeaturetoggle/examplefeaturetoggle/g' \
  -e 's/\/sap\/s4h\/cfnd\/featuretoggle/\/sap\/example\/lib\/featuretoggle/g' {} \;

# 2. Sanitize webide freestyle
find webide_freestyle_custom_webapp_path -type f -name "*.json" -exec sed -i '' \
  -e 's/fin\.central\.listreport\.reuse/demo.central.listreport.reuse/g' {} \;

# 3. Sanitize webide lrop reuse lib
find webide_v2_lrop_reuselib_ui5_tooling_routing_project -type f -name "*.json" -exec sed -i '' \
  -e 's/i2d\.qm\.defect\.records1/demo.qm.defect.records/g' {} \;

# 4. Sanitize CA FIORI inbox
find CA_FIORI_INBOXExtension -type f -name "*.json" -exec sed -i '' \
  -e 's/cross\.fnd\.fiori\.inbox\.sample_fiori_inboxextension/demo.fiori.inbox.extension/g' {} \;

# 5. (Optional) Sanitize ES5 references
find multi_destination_ovp_mta -type f -name "*.json" -exec sed -i '' \
  -e 's/ES5_Basic/DEMO_SYSTEM/g' \
  -e 's/ES5 Gateway Demo System/Demo OData System/g' {} \;

echo "✅ Sanitization complete"
```

---

## Validation Checklist

Before publishing to open-source:

- [ ] Run sanitization script
- [ ] Test all projects still migrate successfully
- [ ] Update snapshots after sanitization
- [ ] Verify no internal SAP patterns remain
- [ ] Check for any new sensitive data in recent commits
- [ ] Review all `.che/project.json` and `.project.json` files
- [ ] Grep for internal domains: `grep -r "wdf.sap.corp\|ldai\|\.sap\.corp"`
- [ ] Grep for internal systems: `grep -r "ER9\|GM6\|ES4"`
- [ ] Grep for SAP internal patterns: `grep -r "s4h\|cfnd\|i2d\|cross\.fnd"`

---

## Conclusion

**Assessment:** Test projects are SAFE for open-source with minor sanitization

**Required Actions:**
1. ✅ Run sanitization script on 4 projects (reuse_library, webide_freestyle, webide_v2_lrop_reuselib, CA_FIORI_INBOXExtension)
2. ✅ Update test snapshots
3. ✅ Verify tests still pass

**Optional Actions:**
- Replace "ES5_Basic" with "DEMO_SYSTEM" for clarity (ES5 is public, so not strictly necessary)

**Risk After Sanitization:** ✅ **NONE** - All sensitive patterns removed

---

**Generated:** October 2, 2026  
**Reviewed:** Test projects in open-ux-tools/packages/fiori-migration-writer/test/input/
