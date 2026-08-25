---
name: sap-fiori-tree-table
description: Configure hierarchical tree table to SAP Fiori elements application for displaying parent-child recursive hierarchies. Supports CAP and ABAP RAP (OData V4).
argument-hint: Entity name (and ABAP package for RAP projects)
metadata:
  author: sap-fiori-tools
  version: "0.0.1"
---

# SAP Fiori Tree Table with Recursive Hierarchy

## Purpose
Configure **hierarchical tree table** to display parent-child relationships in a recursive structure (organizational hierarchies, category trees, nested data).

## Environment Requirements

**CAP Projects:**
- ✅ **VS Code or SAP Business Application Studio (BAS)** - Both environments supported
- ✅ **Fiori MCP Server** - Required for Fiori app generation and modification (VS Code only)
- ✅ **CDS MCP Server** - Required for CDS model queries

**ABAP RAP Projects:**
- ✅ **VS Code only** - ABAP Development Tools extension is VS Code-specific
- ✅ **Fiori MCP Server** - Required for Fiori app generation and modification
- ✅ **ABAP Development Tools for VS Code extension** - Required for backend development (includes ADT MCP server for RAP operations)

## MANDATORY: Gather Required Inputs First

**STOP and ASK the user for ALL of these inputs if ANY are missing from the prompt:**

### For ABAP RAP Projects:
1. **Package name** - Where to create or find backend hierarchy objects ($TMP for local, or specific package like Z_MAINT)
2. **Transport Required**: Depends on package type (No for local packages like $TMP, Yes for transportable packages)
3. **Entity name** - The entity to make hierarchical (e.g., "Equipment", "Category", "FunctionalLocation")

### For CAP Projects:
1. **Entity name** - The entity to make hierarchical (e.g., "Travel", "Category", "ProductCategory")

**DO NOT proceed with implementation until all inputs are confirmed.**

---

## CAP Implementation (6 Steps)

### Prerequisites
- ✅ VS Code or SAP Business Application Studio environment
- ✅ Fiori MCP Server (VS Code) for app modifications
- ✅ Existing CAP project with CDS entity
- ✅ SAP Fiori Elements List Report application
- ✅ CAP service must be exposed as OData V4 (recursive hierarchy is V4-only)
- ✅ Entity must have a **single key field** (UUID, String, or Integer)
- ✅ CDS MCP server tools available
- ✅ @sap/cds version 9.6.0 or higher (required for @hierarchy annotation support)

**Key Types Supported:**
- ✅ **UUID keys** (using `cuid`) - Traditional approach
- ✅ **String keys** (e.g., `key categoryID : String(10)`) - Business keys like "CAT-001"
- ✅ **Integer keys** (e.g., `key id : Integer`) - Numeric identifiers
- ⚠️ **Composite keys are NOT supported** for hierarchies

### 1. Check Current Entity Structure
Use the CDS MCP to search the model for the target entity structure before making changes

### 2. Add Hierarchy Association
Add self-referencing managed association to `db/schema.cds`:

**Option A: With UUID key (using cuid)**
```cds
entity <EntityName> : cuid, managed {
  // ... existing fields ...
  parent : Association to <EntityName>;  // ← Add this managed association
  // ... rest of entity ...
}
```

**Option B: With Business Key (String/Integer)**
```cds
entity <EntityName> : managed {
  key categoryID : String(10);  // Your business key
  // ... existing fields ...
  parent : Association to <EntityName>;  // ← Add this managed association
  // ... rest of entity ...
}
```

✅ **Must be managed** (no `on` condition)  
✅ **Name it `parent`** (creates `parent_<keyname>` foreign key)
✅ **Single key only** (composite keys not supported for hierarchies)

### 3. Add @hierarchy Annotation
Add to service entity in `srv/<service>.cds`:

```cds
service <ServiceName> @(path: '/<path>') {
  @hierarchy  // ← Add this annotation
  entity <EntityName> as projection on db.<EntityName> {
    *,
    // ... redirected associations ...
  };
}
```

✅ **On service entity** (not database entity)  
✅ **Before entity definition**

### 4. Configure TreeTable in Manifest
Update List Report target in `app/<app>/webapp/manifest.json`:

**Path:** `sap.ui5.routing.targets.<ListReportTargetName>.options.settings.controlConfiguration`

```json
"controlConfiguration": {
  "@com.sap.vocabularies.UI.v1.LineItem": {
    "tableSettings": {
      "type": "TreeTable",
      "hierarchyQualifier": "<EntityName>Hierarchy"
    }
  }
}
```

✅ **type: "TreeTable"** (not "ResponsiveTable")  
✅ **hierarchyQualifier** matches the auto-registered qualifier from `@hierarchy` annotation (CAP auto-registers `<EntityName>Hierarchy` when `@hierarchy` is applied)

### 5. Create Sample Hierarchical Data
Create CSV at `db/data/<namespace>-<EntityName>.csv`:

**For UUID keys (using cuid):**
```csv
ID;Name;Description;parent_ID
11111111-1111-1111-1111-111111111111;Electronics;;
22222222-2222-2222-2222-222222222222;Computers;;11111111-1111-1111-1111-111111111111
33333333-3333-3333-3333-333333333333;Laptops;;22222222-2222-2222-2222-222222222222
44444444-4444-4444-4444-444444444444;Desktops;;22222222-2222-2222-2222-222222222222
55555555-5555-5555-5555-555555555555;Home & Garden;;
66666666-6666-6666-6666-666666666666;Furniture;;55555555-5555-5555-5555-555555555555
```

**For Business keys (String keys):**
```csv
categoryID;name;description;parent_categoryID
CAT-001;Electronics;;
CAT-002;Computers;;CAT-001
CAT-003;Laptops;;CAT-002
CAT-004;Desktops;;CAT-002
CAT-008;Home & Garden;;
CAT-009;Furniture;;CAT-008
```

✅ **Use `parent_<keyname>`** (with underscore!) - e.g., `parent_ID` or `parent_categoryID`  
✅ **Root items have empty parent field**  
✅ **For UUID: Valid UUID format** (use real UUIDs for production data)
✅ **For String: Use your business key values** (e.g., CAT-001, PROD-123)

### 6. Test
```bash
npm run watch-<app-name>
```
---

## ABAP RAP Implementation (4 Steps)

### Prerequisites
- ✅ VS Code environment with SAP Fiori MCP Server and ABAP Development Tools for VS Code extension
- ✅ ABAP system with RAP and OData V4 support
- ✅ RAP backend such as SAP BTP ABAP Environment or SAP S/4HANA Public Cloud Edition, must run on version 2602 or higher

### ⚠️ Important Restrictions

- **Tree table cannot be displayed with a draft-enabled service in the flexible column layout**
- **Search annotations must be removed:** Remove `@Search.searchable` and `@Search.defaultSearchElement` annotations from projection views with `@OData.hierarchy.recursiveHierarchy` annotation. The OData hierarchy specification conflicts with search capabilities - hierarchical nodes use special query parameters that are incompatible with standard search operations.

### 0. Decision: Read-Only vs. Editable Hierarchy

**CRITICAL: Understand the fundamental differences between hierarchy types**

#### Read-Only Hierarchy (WITHOUT Directory Table)
- **Display Location:** List Report page ONLY
- **Cannot be shown:** Object Page (no composition support without directory)
- **Capabilities:** View-only, navigation, filtering
- **Use Case:** Display organizational charts, browse categories, view reporting structure
- **Backend:** Simple self-referencing association, no directory table
- **Example:** Employee list showing manager-employee hierarchy on main page

#### Editable Hierarchy (WITH Directory Table)
- **Display Location:** List Report AND Object Page
- **Required:** Directory table pattern with composition
- **Capabilities:** Create, delete, move nodes, draft handling, inline creation
- **Use Case:** Manage hierarchical data, modify structure, transactional operations
- **Backend:** Directory + hierarchy tables, managed associations, draft support
- **Example:** Department object page showing editable employee hierarchy in subsection

**Decision Criteria:**

**Use READ-ONLY when:**
- User wants: "display", "view", "browse", "show", "list"
- Hierarchy appears: On main List Report page only
- No editing needed
- 📖 **Reference:** [Read-Only Treeviews Guide](./references/1-read-only-treeviews.md)

**Use EDITABLE when:**
- User wants: "edit", "create", "delete", "manage", "modify"
- Hierarchy appears: On Object Page (as child composition)
- Transactional operations required
- 📖 **Reference:** [Editable Treeviews Guide](./references/2-editable-treeviews.md)

**When in doubt, ask:**
> "1. Where should the hierarchy appear? (List Report only, or Object Page subsection?)
> 2. Do you need to edit the hierarchy (create/delete/move nodes) or just view it?"

### 1. Check for Existing Hierarchy
Examine `webapp/localService/mainService/metadata.xml` for:
- `SAP__hierarchy.RecursiveHierarchySupported`
- `SAP__hierarchy.RecursiveHierarchy`
- `SAP__aggregation.RecursiveHierarchy`

**If found:**
- Extract Qualifier value (e.g., "ZZZR_TRAVEL000_HIERARCHY")
- Skip to Step 3

**If not found:**
- Backend needs hierarchy implementation
- Proceed to Step 2

### 2. Implement Hierarchy in Backend

**Implementation Guides:**
- **[Read-Only Treeviews Guide](./references/1-read-only-treeviews.md)** - 6-step implementation for read-only hierarchies
- **[Editable Treeviews Guide](./references/2-editable-treeviews.md)** - 9-step implementation with draft, directories, and actions

### 3. Configure TreeTable in Manifest
Update List Report target in `webapp/manifest.json`:

```json
"controlConfiguration": {
  "@com.sap.vocabularies.UI.v1.LineItem": {
    "tableSettings": {
      "type": "TreeTable",
      "hierarchyQualifier": "ZZZR_TRAVEL000_HIERARCHY"
    }
  }
}
```

✅ **Use EXACT Qualifier** from metadata (case-sensitive)  
✅ **type: "TreeTable"**

### 4. Test
```bash
npm run start-mock  # Needs metadata refresh
npm start           # No refresh - fetches metadata from live backend
```
Consult Fiori MCP server if available on how to refresh metadata for SAP/cloud systems.

---

## Common Errors and Solutions

### CAP Errors

**"@hierarchy not supported for unmanaged association"**
```cds
// ❌ Wrong
parent : Association to Travel on parent.ID = parentID;

// ✅ Correct
parent : Association to Travel;
```

**"table has no column named parentID"**
- Use `parent_ID` (underscore!) in CSV header

**"No artifact 'cuid'"**
```cds
using { cuid, managed } from '@sap/cds/common';
```

**"@hierarchy ignored"**
- Association must be managed (no `on` condition)
- Must reference same entity type

**"CDS compilation failed"**
- `@hierarchy` on service entity (not db entity)
- Entity must have a single key field (UUID, String, or Integer)
- Parent association must be self-referencing
- Composite keys are not supported

**"hierarchyQualifier not found"**
- Verify `@hierarchy` in `srv/<service>.cds`
- Check metadata: `http://localhost:<port>/service/$metadata`
- Restart CAP service

**"Failed to parse metadata"**
- Check CDS compilation errors
- Run: `cds compile srv --to edmx`
- Restart service

**"TreeTable not rendering"**
- `type: "TreeTable"` (not "ResponsiveTable")
- `hierarchyQualifier` matches service
- CSV has `parent_ID` column (underscore!)
- Root items have empty `parent_ID`

**"Data not loading"**
- CSV in `db/data/` with correct name
- Semicolon (`;`) delimiter
- Correct foreign key column name: `parent_<keyname>` (e.g., `parent_ID` or `parent_categoryID`)
- Valid key values matching the key field type (UUIDs for cuid, strings for String keys)
- Run `cds watch` to load data

---

### ABAP RAP Errors

**"Element X must not be search enabled in baseview"**
- Remove `@Search.searchable` and `@Search.defaultSearchElement` annotations from projection view with `@OData.hierarchy.recursiveHierarchy`
- See detailed solution in [Troubleshooting Guide](./references/2.5-troubleshooting-checklist.md)

**"Primary keys do not match"**
- Child table must have composite key (child UUID + parent UUID both as keys)
- See detailed solution in [Troubleshooting Guide](./references/2.5-troubleshooting-checklist.md)

---

## Key Differences

**CAP:**
- Managed association in entity
- `@hierarchy` annotation on service
- CSV data with `parent_ID` column
- Test with `npm run watch`

---

## Best Practices

- Always use managed associations in CAP (no `on` condition)
- Name the parent field `parent` for automatic `parent_<keyname>` foreign key generation
- **Key flexibility**: Use UUID keys for maximum compatibility, or business keys (String/Integer) for better readability
- When using business keys, ensure they are unique and meaningful (e.g., CAT-001, DEPT-HR)
- Create 2-3 hierarchy levels at minimum for demo
- Test with different data volumes
- Clear browser cache after backend changes

**CAP Specific:**
- Use the CDS MCP to search the model before editing
- Run `cds watch` to reload data
- Check the metadata endpoint for hierarchy annotations
- The foreign key column follows the pattern: `parent_<keyFieldName>` (e.g., `parent_ID`, `parent_categoryID`, `parent_code`)
---

## References

- **CAP Hierarchy Guide**: https://cap.cloud.sap/docs/guides/uis/fiori#fiori-tree-views (Serving SAP Fiori UIs → Fiori Tree Views)
- **ABAP RAP Hierarchies**: https://help.sap.com/docs/abap-cloud/abap-rap/implementing-hierarchical-view